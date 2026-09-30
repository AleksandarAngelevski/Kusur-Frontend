import { Component, signal } from '@angular/core';
import { Group } from '../models/group.model';
import { GroupCard } from '../group-card/group-card';

@Component({
  imports: [GroupCard],
  selector: 'app-groups-component',
  styleUrl: './groups-component.css',
  templateUrl: './groups-component.html',
})
export class GroupsComponent {
  groups = signal<Group[]>([
    { id: 1, name: 'Ohrid Trip', memberCount: 4, balance: 1200 },
    { id: 2, name: 'Apartment', memberCount: 3, balance: -3500 },
  ]);
}

