import { AfterContentInit, HostListener, ContentChildren, Component, ElementRef, forwardRef, OnDestroy, Optional, Renderer, Input, QueryList, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { Alert, App, Config, Form, Item, NavController, Option, Ion, Events } from 'ionic-angular';
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
export class SelectAlertless extends Ion implements AfterContentInit, ControlValueAccessor, OnDestroy {
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
	_config: Config;
	// tslint:disable-next-line:variable-name
	private __options: QueryList<Option>;

	@Input() public cancelText: string = 'Cancel';
	@Input() public okText: string = 'OK';
	@Input() public placeholder: string;
	@Input() public selectOptions: any = {};
	@Input() public interface: string = '';
	@Input() public selectedText: string = '';

	@Output() public ionChange: EventEmitter<any> = new EventEmitter();
	@Output() public ionCancel: EventEmitter<any> = new EventEmitter();
	private close = () => (this.overlay ? this.overlay.dismiss() : '');
	constructor(
		private _app: App,
		private _form: Form,
		private config: Config,
		elementRef: ElementRef,
		renderer: Renderer,
		@Optional() public _item: Item,
		@Optional() _nav: NavController,
		events: Events,
	) {
		super(config, elementRef, renderer, 'select');
		this._config = config;
		this.setElementClass(`${this._componentName}`, false);

		if (_item) {
			this.id = 'sel-' + _item.registerInput('select');
			this._labelId = 'lbl-' + _item.id;
			this._item.setElementClass('item-select', true);
		}
		events.unsubscribe('select:close', this.close);
		events.subscribe('select:close', this.close);
	}

	@HostListener('click', ['$event'])
	public _click(ev: UIEvent): void {
		if (ev.detail === 0) {
			// do not continue if the click event came from a form submit
			return;
		}
		ev.preventDefault();
		ev.stopPropagation();
		this.open();
	}

	@HostListener('keyup.space')
	public _keyup(): void {
		if (!this._isOpen) {
			this.open();
		}
	}

	public set _options(val: any) {
		this.__options = val;
		if (!this._multi) {
			this.__options.forEach(option => {
				option.ionSelect.subscribe(selectedValues => {
					try {
						this.onChange(selectedValues);
					}
					catch (e) {
						// do nothing
					}
					this.ionChange.emit(selectedValues);
					this._isOpen = false;
					this.overlay.dismiss();
				});
			});
		}
	}

	public get _options(): any {
		return this.__options;
	}

	public open(): void {
		if (this._disabled) {
			return;
		}
		// the user may have assigned some options specifically for the alert
		const selectOptions: any = deepCopy(this.selectOptions);

		// make sure their buttons array is removed from the options
		// and we create a new array for the alert's two buttons
		selectOptions.buttons = [{
			text: this.cancelText,
			role: 'cancel',
			handler: () => {
				this.ionCancel.emit(null);
			},
		}];

		// if the selectOptions didn't provide a title then use the label's text
		if (!selectOptions.title) {
			selectOptions.title = this.placeholder;
		}

		let options: any = this._options.toArray();

		// default to use the alert interface
		this.interface = 'alert';

		// user cannot provide inputs from selectOptions
		// alert inputs must be created by ionic from ion-options
		selectOptions.inputs = this._options.map(input => {
			return {
				type: (this._multi ? 'checkbox' : 'radio'),
				label: input.text,
				value: input.value,
				title: this.placeholder,
				checked: input.selected,
				disabled: input.disabled,
				handler: (selectedOption: any) => {
					// Only emit the select event if it is being checked
					// For multi selects this won't emit when unchecking
					if (selectedOption.checked) {
						input.ionSelect.emit(input.value);
					}
				},
			};
		});

		let selectCssClass: string = 'select-alert';

		// create the alert instance from our built up selectOptions
		this.overlay = new Alert((<any>this)._app, selectOptions, this._config);

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
			},
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

	get text(): string | string[] {
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

	public _updOpts(): void {
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
	public writeValue(val: any): void {
		console.debug('select, writeValue', val);
		this._values = (Array.isArray(val) ? val : isBlank(val) ? [] : [val]);
		this._updOpts();
	}

	/**
	 * @private
	 */
	public ngAfterContentInit(): void {
		this._updOpts();
	}

	/**
	 * @private
	 */
	public registerOnChange(fn: Function): void {
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
	public registerOnTouched(fn: any): void { this.onTouched = fn; }

	/**
	 * @private
	 */
	public onChange(val: any): void {
		// onChange used when there is not an formControlName
		console.debug('select, onChange w/out formControlName', val);
		this._values = (Array.isArray(val) ? val : isBlank(val) ? [] : [val]);
		this._updOpts();
		this.onTouched();
	}

	/**
	 * @private
	 */
	public onTouched(): void {
		// do nothing
	}

	/**
	 * @private
	 */
	public setDisabledState(isDisabled: boolean): void {
		this.disabled = isDisabled;
	}

	/**
	 * @private
	 */
	public ngOnDestroy(): void {

	}

}
