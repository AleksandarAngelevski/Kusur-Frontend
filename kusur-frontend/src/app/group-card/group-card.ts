import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Group } from '../models/group.model';
import { initials } from '../shared/initials';

@Component({
  imports: [DecimalPipe, RouterLink],
  selector: 'app-group-card',
  styleUrl: './group-card.css',
  templateUrl: './group-card.html',
})
export class GroupCard {
  group = input.required<Group>();

  initials = computed(() => initials(this.group().name));
}
