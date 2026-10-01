import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {Activity} from '../models/activity.model';

@Component({
    imports: [DecimalPipe],
    selector: 'app-recent-activity-card',
    styleUrl: './recent-activity-card.css',
    templateUrl: './recent-activity-card.html',
})
export class RecentActivityCard {
    activity = input.required<Activity>();

    /** "Petar added Groceries" -> actor "Petar", rest "added Groceries" */
    actor = computed(() => this.activity().activity.split(' ')[0]);
    rest = computed(() => this.activity().activity.split(' ').slice(1).join(' '));

    /** "You" isn't emphasised, only other people's names */
    actorIsOther = computed(() => this.actor() !== 'You');

    timeAgo = computed(() => {
        const hours = Math.floor((Date.now() - this.activity().timestamp.getTime()) / 3_600_000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return days === 1 ? 'Yesterday' : `${days} days ago`;
    });
}
