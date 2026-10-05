import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GroupCard } from '../group-card/group-card';
import { GroupsService } from '../services/groups.service';

@Component({
  imports: [GroupCard, RouterLink],
  selector: 'app-groups-component',
  styleUrl: './groups-component.css',
  templateUrl: './groups-component.html',
})
export class GroupsComponent {
  groups = inject(GroupsService).groups;
}
