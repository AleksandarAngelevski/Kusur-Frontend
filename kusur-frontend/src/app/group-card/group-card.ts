import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Group } from '../models/group.model';

@Component({
  imports: [DecimalPipe],
  selector: 'app-group-card',
  styleUrl: './group-card.css',
  templateUrl: './group-card.html',
})
export class GroupCard {
  group = input.required<Group>();
}
