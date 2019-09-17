import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'my-app',
  template: `
    <div class="menu">
      <button [ngClass]="{ active: editing }" [disabled]="editing" (click)="changeMode('edit')">Edit</button>
      <button [ngClass]="{ active: deleting }" [disabled]="deleting" (click)="changeMode('delete')">Delete</button>
      |
      <select [ngModel]="currentMaterialIdx" (ngModelChange)="selectMaterial($event)">
        <option *ngFor="let material of materials; let i = index" [value]="i">{{ material.name }}</option>
      </select>
      <button (click)="paintAll()">Base</button>
      |
      <button (click)="showCoords = !showCoords">Coords</button>
      {{ currentMaterial | json }}
    </div>
    <div class="grid-wrapper">
      <table (mouseup)="painting = false" cellspacing="0">
        <tr *ngFor="let row of grid; let i = index">
          <td *ngFor="let cell of row; let j = index" class="cell-wrapper">
            <div class="cell" [ngStyle]="{background: cell ? cell.color : '#000'}" (mousedown)="painting = true; paint(i, j)" (mousemove)="paint(i, j)">
              <span *ngIf="showCoords" class="cell-coords">{{ i }},{{ j }}</span>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `,
  styleUrls: [ './app.component.css' ]
})
export class AppComponent implements OnInit {
  width = 50;
  height = 50;

  editing = true;
  deleting = false;
  painting = false;
  showCoords = true;

  materials = [
    { name: 'Grass', color: '#74ce11' },
    { name: 'Road', color: '#cc7f20' },
    { name: 'Water', color: '#1598e4' }
  ];
  currentMaterial = null;
  currentMaterialIdx = 0;

  grid = [];

  ngOnInit() {
    for (let i = 0; i < this.width; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.height; j++) {
        this.grid[i][j] = null;
      }
    }
    this.currentMaterial = this.materials[0];
  }

  changeMode(mode) {
    this.editing = mode === 'edit';
    this.deleting = mode === 'delete';
  }

  selectMaterial(idx) {
    this.currentMaterialIdx = idx;
    this.currentMaterial = this.materials[idx];
  }

  paint(x, y) {
    if (this.painting) {
      if (this.deleting) {
        this.grid[x][y] = null;
      }
      if (this.editing) {
        this.grid[x][y] = this.currentMaterial;
      }
    }
  }

  paintAll() {
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        this.grid[i][j] = this.currentMaterial;
      }
    }
  }


}
