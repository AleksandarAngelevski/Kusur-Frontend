import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Group } from '../models/group.model';

@Component({
  imports: [DecimalPipe],
  selector: 'app-group-card',
  styleUrl: './group-card.css',
  templateUrl: './group-card.html',
})
export class GroupCard {
  group = input.required<Group>();

  initials = computed(() => {
    const words = this.group().name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  });
}
