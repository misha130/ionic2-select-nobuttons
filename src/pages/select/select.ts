import { AfterContentInit, Component, ContentChildren, ElementRef, EventEmitter, forwardRef, Input, HostListener, OnDestroy, Optional, Output, Renderer, QueryList, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { ActionSheet, Alert, App, Config, Form, Ion, Item, NavController, Option, ViewController } from 'ionic-angular';
import { isBlank, isCheckedProperty, isTrueProperty, deepCopy } from 'ionic-angular/util/util';
import { Select as ImportSelect } from 'ionic-angular/components/select/select';


export class TempSelect extends ImportSelect {
    static decorators = undefined;
    // static propDecorators = undefined;
}

export const SELECT_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Select),
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
export class Select extends TempSelect implements AfterContentInit, ControlValueAccessor, OnDestroy {
    public overlay: Alert;
    private __options: any;
    constructor(
        _app: App,
        _form: Form,
        config: Config,
        elementRef: ElementRef,
        renderer: Renderer,
        @Optional() public _item: Item,
        @Optional() _nav: NavController
    ) {
        super(_app, _form, config, elementRef, renderer, _item, _nav);
        this.setElementClass(`${this._componentName}-${this._mode}`, false);
    }
    public set _options(val) {
        this.__options = val;
        if (!this._multi) {
            this.__options.forEach(option => {
                option.ionSelect.subscribe(selectedValues => {
                    this.ionChange.emit(selectedValues);
                    this._isOpen = false;
                    this.onChange(selectedValues);
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
}