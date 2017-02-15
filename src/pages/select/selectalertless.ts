import { AfterContentInit, HostListener, ContentChildren, Component, ElementRef, forwardRef, OnDestroy, Optional, Renderer, Input, QueryList, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { Alert, App, Config, Form, Item, NavController, Option } from 'ionic-angular';
import { isBlank, isCheckedProperty, isTrueProperty, deepCopy } from 'ionic-angular/util/util';

export const SELECT_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectAlertless),
    multi: true
};

@Component({
    selector: 'select-alertless',
    styles: ['.select-alertless .alert-button-group{display:none}'],
    template:
    '<div *ngIf="!_text" class="select-placeholder select-text">{{placeholder}}</div>' +
    '<div *ngIf="_text" class="select-text">{{selectedText || _text}}</div>' +
    '<div class="select-icon">' +
    '<div class="select-icon-inner"></div>' +
    '</div>' +
    '<button aria-haspopup="true" ' +
    '[id]="id" ' +
    'ion-button="item-cover" ' +
    '[attr.aria-labelledby]="_labelId" ' +
    '[attr.aria-disabled]="_disabled" ' +
    'class="item-cover">' +
    '</button>',
    host: {
        '[class.select-disabled]': '_disabled'
    },
    providers: [SELECT_VALUE_ACCESSOR],
    encapsulation: ViewEncapsulation.None,
})
export class SelectAlertless implements AfterContentInit, ControlValueAccessor, OnDestroy {
    public id: string;
    public overlay: Alert;

    private _disabled: any = false;
    private _labelId: string;
    private _multi: boolean = false;
    private _values: string[] = [];
    private _texts: string[] = [];
    private _text: string = '';
    private _fn: Function;
    private _isOpen: boolean = false;

    private __options: QueryList<Option>;

    @Input() cancelText: string = 'Cancel';
    @Input() okText: string = 'OK';
    @Input() placeholder: string;
    @Input() selectOptions: any = {};
    @Input() interface: string = '';
    @Input() selectedText: string = '';

    @Output() ionChange: EventEmitter<any> = new EventEmitter();
    @Output() ionCancel: EventEmitter<any> = new EventEmitter();

    constructor(
        private _app: App,
        private _form: Form,
        config: Config,
        elementRef: ElementRef,
        renderer: Renderer,
        @Optional() public _item: Item,
        @Optional() _nav: NavController
    ) {
        _form.register(this);

        if (_item) {
            this.id = 'sel-' + _item.registerInput('select');
            this._labelId = 'lbl-' + _item.id;
            this._item.setElementClass('item-select', true);
        }
    }

    @HostListener('click', ['$event'])
    _click(ev: UIEvent) {
        if (ev.detail === 0) {
            // do not continue if the click event came from a form submit
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        this.open();
    }

    @HostListener('keyup.space')
    _keyup() {
        if (!this._isOpen) {
            this.open();
        }
    }

    public set _options(val) {
        this.__options = val;
        if (!this._multi) {
            this.__options.forEach(option => {
                option.ionSelect.subscribe(selectedValues => {
                    try {
                        this.onChange(selectedValues);
                    }
                    catch (e) {

                    }
                    this.ionChange.emit(selectedValues);
                    this._isOpen = false;
                    this.overlay.dismiss();
                });
            });
        }
    }

    public get _options() {
        return this.__options;
    }

    open() {
        if (this._disabled) {
            return;
        }
        // the user may have assigned some options specifically for the alert
        const selectOptions = deepCopy(this.selectOptions);

        // make sure their buttons array is removed from the options
        // and we create a new array for the alert's two buttons
        selectOptions.buttons = [{
            text: this.cancelText,
            role: 'cancel',
            handler: () => {
                this.ionCancel.emit(null);
            }
        }];

        // if the selectOptions didn't provide a title then use the label's text
        if (!selectOptions.title && this._item) {
            selectOptions.title = this._item.getLabelText();
        }

        let options = this._options.toArray();


        // default to use the alert interface
        this.interface = 'alert';

        // user cannot provide inputs from selectOptions
        // alert inputs must be created by ionic from ion-options
        selectOptions.inputs = this._options.map(input => {
            return {
                type: (this._multi ? 'checkbox' : 'radio'),
                label: input.text,
                value: input.value,
                checked: input.selected,
                disabled: input.disabled,
                handler: (selectedOption: any) => {
                    // Only emit the select event if it is being checked
                    // For multi selects this won't emit when unchecking
                    if (selectedOption.checked) {
                        input.ionSelect.emit(input.value);
                    }
                }
            };
        });

        var selectCssClass = 'select-alert';

        // create the alert instance from our built up selectOptions
        this.overlay = new Alert((<any>this)._app, selectOptions);

        if (this._multi) {
            // use checkboxes
            selectCssClass += ' multiple-select-alert';
        } else {
            // use radio buttons
            selectCssClass += ' single-select-alert select-alertless';
        }

        // If the user passed a cssClass for the select, add it
        selectCssClass += selectOptions.cssClass ? ' ' + selectOptions.cssClass : '';
        this.overlay.setCssClass(selectCssClass);

        this.overlay.addButton({
            text: this.okText,
            handler: (selectedValues: any) => {
                this.onChange(selectedValues);
                this.ionChange.emit(selectedValues);
            }
        });


        this.overlay.present(selectOptions);

        this._isOpen = true;
        this.overlay.onDidDismiss(() => {
            this._isOpen = false;
        });
    }

    @Input()
    get multiple(): any {
        return this._multi;
    }

    set multiple(val: any) {
        this._multi = isTrueProperty(val);
    }

    get text() {
        return (this._multi ? this._texts : this._texts.join());
    }

    @ContentChildren(Option)
    set options(val: QueryList<Option>) {
        this._options = val;

        if (!this._values.length) {
            // there are no values set at this point
            // so check to see who should be selected
            this._values = val.filter(o => o.selected).map(o => o.value);
        }

        this._updOpts();
    }

    _updOpts() {
        this._texts = [];

        if (this._options) {
            this._options.forEach(option => {
                // check this option if the option's value is in the values array
                option.selected = this._values.some(selectValue => {
                    return isCheckedProperty(selectValue, option.value);
                });

                if (option.selected) {
                    this._texts.push(option.text);
                }
            });
        }

        this._text = this._texts.join(', ');
    }

	/**
	 * @input {boolean} If true, the user cannot interact with this element.
	 */
    @Input()
    get disabled(): boolean {
        return this._disabled;
    }

    set disabled(val: boolean) {
        this._disabled = isTrueProperty(val);
        this._item && this._item.setElementClass('item-select-disabled', this._disabled);
    }

	/**
	 * @private
	 */
    writeValue(val: any) {
        console.debug('select, writeValue', val);
        this._values = (Array.isArray(val) ? val : isBlank(val) ? [] : [val]);
        this._updOpts();
    }

	/**
	 * @private
	 */
    ngAfterContentInit() {
        this._updOpts();
    }

	/**
	 * @private
	 */
    registerOnChange(fn: Function): void {
        this._fn = fn;
        this.onChange = (val: any) => {
            console.debug('select, onChange', val);
            fn(val);
            this._values = (Array.isArray(val) ? val : isBlank(val) ? [] : [val]);
            this._updOpts();
            this.onTouched();
        };
    }

	/**
	 * @private
	 */
    registerOnTouched(fn: any) { this.onTouched = fn; }

	/**
	 * @private
	 */
    onChange(val: any) {
        // onChange used when there is not an formControlName
        console.debug('select, onChange w/out formControlName', val);
        this._values = (Array.isArray(val) ? val : isBlank(val) ? [] : [val]);
        this._updOpts();
        this.onTouched();
    }

	/**
	 * @private
	 */
    onTouched() { }

	/**
	 * @private
	 */
    setDisabledState(isDisabled: boolean) {
        this.disabled = isDisabled;
    }

	/**
	 * @private
	 */
    ngOnDestroy() {
        this._form.deregister(this);
    }

}