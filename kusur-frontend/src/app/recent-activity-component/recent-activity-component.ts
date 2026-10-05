import { Component, computed, inject, input } from '@angular/core';
import { RecentActivityCard } from '../recent-activity-card/recent-activity-card';
import { GroupsService } from '../services/groups.service';

@Component({
    imports: [RecentActivityCard],
    selector: 'app-recent-activity-component',
    styleUrl: './recent-activity-component.css',
    templateUrl: './recent-activity-component.html',
})
export class RecentActivityComponent {
    /** show only the newest few, e.g. on the home page; everything when not set */
    limit = input<number>();

    private all = inject(GroupsService).activity;

    activites = computed(() => {
        const limit = this.limit();
        return limit ? this.all().slice(0, limit) : this.all();
    });
}
