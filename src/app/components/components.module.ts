import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { MapEditorComponent } from './map-editor/map-editor.component';

@NgModule({
  imports: [ BrowserModule, FormsModule ],
  declarations: [ MapEditorComponent ],
})
export class ComponentsModule { }
