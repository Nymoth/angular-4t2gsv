import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'pk-map-editor',
  templateUrl: './map-editor.component.html',
  styleUrls: [ './map-editor.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapEditorComponent implements OnInit {
  width = 50;
  height = 50;

  loading = true;
  editing = true;
  deleting = false;
  painting = false;
  showCoords = true;

  textures = [];
  currentTexture = null;
  currentTextureIdx = 0;

  grid = [];

  constructor(
    private _changeDetector: ChangeDetectorRef,
    private _storage: StorageService
  ) { }

  ngOnInit() {
    for (let i = 0; i < this.width; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.height; j++) {
        this.grid[i][j] = {};
      }
    }
    this._storage.getAllTextures().subscribe(res => {
      this.textures = res;
      this.currentTexture = this.textures[0];
      this.loading = false;
      this._changeDetector.markForCheck();
    });
  }

  changeMode(mode) {
    this.editing = mode === 'edit';
    this.deleting = mode === 'delete';
    this._changeDetector.markForCheck();
  }

  selectMaterial(idx) {
    this.currentTextureIdx = idx;
    this.currentTexture = this.textures[idx];
    this._changeDetector.markForCheck();
  }

  paint(x, y) {
    if (this.painting) {
      if (this.deleting) {
        this.grid[x][y].texture = null;
      }
      if (this.editing) {
        this.grid[x][y].texture = this.currentTexture;
      }
      this._changeDetector.markForCheck();
    }
  }

  paintAll() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.grid[i][j].texture = this.currentTexture;
      }
    }
    this._changeDetector.markForCheck();
  }
}
