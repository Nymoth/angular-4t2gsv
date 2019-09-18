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

  async upload(files, texture) {
    const reader = new FileReader();
    const p = new Promise(res => {
      reader.onload = () => res(reader.result)
    });
    reader.readAsDataURL(files.item(0));
    texture.render = await p;
  }

  delete(texture, idx) {
    if (texture.id) {
      this._storage.deleteTexture(texture.id).subscribe(() => this._loadTextures())
    } else {
      this.textures.splice(idx, 1);
    }
  }

  private _loadTextures() {
    this.loading = true;
    this._storage.getAllTextures().subscribe(res => {
      this.textures = res;
      this.loading = false;
      if (this.textures.length === 0) {
        this.new();
      }
    });
  }
}