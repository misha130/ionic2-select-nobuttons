import { Component } from '@angular/core';
import { HomePage } from '../pages/home/home';
import { Platform } from 'ionic-angular';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = HomePage;

  constructor(platform: Platform) {
    platform.ready().then(() => {
    });
  }
}
