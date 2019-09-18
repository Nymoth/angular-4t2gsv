import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { MapEditorComponent } from './map-editor/map-editor.component';
import { TextureEditorComponent } from './texture-editor/texture-editor.component';

@NgModule({
  imports: [ BrowserModule, FormsModule ],
  declarations: [ MapEditorComponent, TextureEditorComponent ],
  exports: [MapEditorComponent, TextureEditorComponent]
})
export class ComponentsModule { }
