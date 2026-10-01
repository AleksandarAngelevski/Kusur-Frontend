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
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
