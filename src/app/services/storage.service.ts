import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import Dexie from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  static readonly DB_NAME = 'pk_db';

  db: any;

  constructor() {
    this.db = new Dexie(StorageService.DB_NAME);
    this.db.version(1).stores({
      maps: '++id,name,grid',
      textures: '++id,name,render,fallback'
    })
  }

  getMap(id) {
    return from(this.db.maps.get(id));
  }

  saveMap(map) {
    return from(this.db.maps.put(map));
  }

  getAllTextures() {
    return from(this.db.textures.toArray());
  }

  saveTexture(texture) {
    return from(this.db.textures.put(texture));
  }

}