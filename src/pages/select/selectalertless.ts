import { AfterContentInit, Component, ContentChildren, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Optional, Output, QueryList, Renderer, ViewEncapsulation, forwardRef } from '@angular/core';
import { Alert, App, Config, DeepLinker, Events, Form, Ion, Item, NavController, Option } from 'ionic-angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { assert, deepCopy, deepEqual, isBlank, isCheckedProperty, isTrueProperty } from 'ionic-angular/util/util';

import { BaseInput } from 'ionic-angular/util/base-input'

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
	providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: SelectAlertless, multi: true }],
	encapsulation: ViewEncapsulation.None,
})
export class SelectAlertless extends BaseInput<any> implements OnDestroy {
	public id: string;
	public overlay: Alert;

	_disabled: any = false;
	_labelId: string;
	private _multi: boolean = false;
	private _values: string[] = [];
	private _texts: string[] = [];
	private _text: string = '';
	private _fn: Function;
	private _isOpen: boolean = false;
	_config: Config;
	// tslint:disable-next-line:variable-name
	private __options: QueryList<Option>;
	_compareWith: (o1: any, o2: any) => boolean = isCheckedProperty;
	@Input() public cancelText: string = 'Cancel';
	@Input() public okText: string = 'OK';
	@Input() public placeholder: string;
	@Input() public selectOptions: any = {};
	@Input() public interface: string = '';
	@Input() public selectedText: string = '';

	@Input()
	set compareWith(fn: (o1: any, o2: any) => boolean) {
		if (typeof fn !== 'function') {
			throw new Error(`compareWith must be a function, but received ${JSON.stringify(fn)}`);
		}
		this._compareWith = fn;
	}

	@Output() public ionChange: EventEmitter<any> = new EventEmitter();
	@Output() public ionCancel: EventEmitter<any> = new EventEmitter();
	private close = () => (this.overlay ? this.overlay.dismiss() : '');
	constructor(
		private _app: App,
		form: Form,
		public config: Config,
		elementRef: ElementRef,
		renderer: Renderer,
		@Optional() item: Item,
		public deepLinker: DeepLinker,
		events: Events,
	) {
		super(config, elementRef, renderer, 'select', [], form, item, null);
		events.unsubscribe('select:close', this.close);
		events.subscribe('select:close', this.close);
	}

	@HostListener('click', ['$event'])
	_click(ev: UIEvent) {
		ev.preventDefault();
		ev.stopPropagation();
		this.open(ev);
	}

	@HostListener('keyup.space')
	_keyup() {
		this.open();
	}


	/**
	 * @hidden
	 */
	getValues(): any[] {
		const values = Array.isArray(this._value) ? this._value : [this._value];
		assert(this._multi || values.length <= 1, 'single only can have one value');
		return values;
	}

	public set _options(val: any) {
		this.__options = val;
		if (!this._multi) {
			this.__options.forEach(option => {
				if (option.ionSelect.observers.some(d => d.closed === false)) return;
				option.ionSelect.subscribe(selectedValues => {
					this.value = selectedValues
					this._isOpen = false;
					this.overlay.dismiss();
				});
			});
		}
	}

	public get _options(): any {
		return this.__options;
	}

	open(ev?: UIEvent) {
		if (this.isFocus() || this._disabled) {
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
			handler: (selectedValues) => this.value = selectedValues
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

	/**
	 * @private
	 */
	@ContentChildren(Option)
	set options(val: QueryList<Option>) {
		this._options = val;
		const values = this.getValues();
		if (values.length === 0) {
			// there are no values set at this point
			// so check to see who should be selected
			// we use writeValue() because we don't want to update ngModel
			this.writeValue(val.filter(o => o.selected).map(o => o.value));
		} else {
			this._inputUpdated();
		}
	}

	_inputShouldChange(val: string[] | string): boolean {
		return !deepEqual(this._value, val);
	}

	/**
	 * TODO: REMOVE THIS
	 * @hidden
	 */
	_inputChangeEvent(): any {
		return this.value;
	}

	/**
	 * @hidden
	 */
	_inputUpdated() {
		this._texts.length = 0;

		if (this._options) {
			this._options.forEach(option => {
				// check this option if the option's value is in the values array
				option.selected = this.getValues().some(selectValue => {
					return this._compareWith(selectValue, option.value);
				});

				if (option.selected) {
					this._texts.push(option.text);
				}
			});
		}

		this._text = this._texts.join(', ');
		super._inputUpdated();
	}

}