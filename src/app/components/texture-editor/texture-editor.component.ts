import { Component, OnInit } from '@angular/core';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'pk-texture-editor',
  templateUrl: './texture-editor.component.html',
  styleUrls: [ './texture-editor.component.css' ]
})
export class TextureEditorComponent implements OnInit {

  loading = true;
  textures = [];

  constructor(private _storage: StorageService) {}

  ngOnInit() {
    this._loadTextures();
  }

  new() {
    this.textures.push({
      name: '',
      render: null,
      fallback: '#000'
    });
  }

  save(texture) {
    this.loading = true;
    this._storage.saveTexture(texture).subscribe(() => this._loadTextures());
  }

  upload(files, texture) {
    const file = files.item(0);
    texture.render = file;
  }

  private _loadTextures() {
    this.loading = true;
    this._storage.getAllTextures().subscribe(res => {
      this.textures = res;
      this.loading = false;
    });
  }
}