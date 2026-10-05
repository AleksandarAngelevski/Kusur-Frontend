import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentActivityCard } from './recent-activity-card';

describe('RecentActivityCard', () => {
    let component: RecentActivityCard;
    let fixture: ComponentFixture<RecentActivityCard>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecentActivityCard],
        }).compileComponents();

        fixture = TestBed.createComponent(RecentActivityCard);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('activity', {
            id: 1,
            activity: 'Petar added Groceries',
            groupName: 'Skopje Flat 3B',
            timestamp: new Date(),
            amount: 1200,
        });
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
