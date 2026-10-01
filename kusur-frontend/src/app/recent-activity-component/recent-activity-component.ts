import { Component, signal } from '@angular/core';
import { Activity } from '../models/activity.model';
import { RecentActivityCard } from '../recent-activity-card/recent-activity-card';

/** Dummy-data helper: a Date the given number of hours in the past. */
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

@Component({
    imports: [RecentActivityCard],
    selector: 'app-recent-activity-component',
    styleUrl: './recent-activity-component.css',
    templateUrl: './recent-activity-component.html',
})
export class RecentActivityComponent {
    activites = signal<Activity[]>(
        [
            { id: 1, activity: 'Petar added Groceries', groupName: 'Skopje Flat 3B', timestamp: hoursAgo(2), amount: 1200 },
            { id: 2, activity: 'You added Gas', groupName: 'Ohrid Weekend', timestamp: hoursAgo(26), amount: 600 },
            { id: 3, activity: 'Marija settled up', groupName: 'CS Study Squad', timestamp: hoursAgo(50), amount: 140 },
            { id: 4, activity: 'Nikola added Electricity bill', groupName: 'Skopje Flat 3B', timestamp: hoursAgo(75), amount: 2350 },
            { id: 5, activity: 'You settled up', groupName: 'Ohrid Weekend', timestamp: hoursAgo(120), amount: 900 },
            { id: 6, activity: 'Ana added Pizza night', timestamp: hoursAgo(168), amount: 780 },
        ]
    )
}
