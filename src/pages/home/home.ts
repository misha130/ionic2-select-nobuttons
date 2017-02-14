import { Component, ViewChild } from '@angular/core';
import { Alert, Select, NavController } from 'ionic-angular';
import { deepCopy } from 'ionic-angular/util/util';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  private select: Select;
  public test: any;
  @ViewChild('select') public set ex(select: any | undefined) {
    this.select = select;
    if (select === undefined) return;
    select.open = this.open;
    if (select._options === undefined) {
      Object.defineProperty(select, '_options', {
        set: (val) => {
          select['__options'] = val;
          val.forEach(option => option.ionSelect.subscribe(d => {
            console.log(d)
            this.test = d;
            select.overlay.dismiss();
          }));
        },
        get: function () { return select['__options'] }
      })
    }
  }
  constructor(public navCtrl: NavController) {

  }
  open() {
    if ((<any>this)._disabled) {
      return;
    }

    console.debug('select, open alert');

    // the user may have assigned some options specifically for the alert
    const selectOptions = deepCopy((<any>this).selectOptions);

    // make sure their buttons array is removed from the options
    // and we create a new array for the alert's two buttons
    selectOptions.buttons = [{
      text: (<any>this).cancelText,
      role: 'cancel',
      handler: () => {
        (<any>this).ionCancel.emit(null);
      }
    }];

    // if the selectOptions didn't provide a title then use the label's text
    if (!selectOptions.title && (<any>this)._item) {
      selectOptions.title = (<any>this)._item.getLabelText();
    }

    let options = (<any>this)._options.toArray();


    // default to use the alert interface
    (<any>this).interface = 'alert';

    // user cannot provide inputs from selectOptions
    // alert inputs must be created by ionic from ion-options
    selectOptions.inputs = (<any>this)._options.map(input => {
      return {
        type: ((<any>this)._multi ? 'checkbox' : 'radio'),
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
    (<any>this).overlay = new Alert((<any>(<any>this))._app, selectOptions);

    if ((<any>this)._multi) {
      // use checkboxes
      selectCssClass += ' multiple-select-alert select-alertless';
    } else {
      // use radio buttons
      selectCssClass += ' single-select-alert select-alertless';
    }

    // If the user passed a cssClass for the select, add it
    selectCssClass += selectOptions.cssClass ? ' ' + selectOptions.cssClass : '';
    (<any>this).overlay.setCssClass(selectCssClass);

    (<any>this).overlay.addButton({
      text: (<any>this).okText,
      handler: (selectedValues: any) => {
        (<any>this).onChange(selectedValues);
        (<any>this).ionChange.emit(selectedValues);
      }
    });


    (<any>this).overlay.present(selectOptions);

    (<any>this)._isOpen = true;
    (<any>this).overlay.onDidDismiss(() => {
      (<any>this)._isOpen = false;
    });
  }
}

