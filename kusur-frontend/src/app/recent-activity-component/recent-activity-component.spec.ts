import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentActivityComponent } from './recent-activity-component';

describe('RecentActivityComponent', () => {
    let component: RecentActivityComponent;
    let fixture: ComponentFixture<RecentActivityComponent>;

    const cards = () => (fixture.nativeElement as HTMLElement).querySelectorAll('app-recent-activity-card');

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RecentActivityComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(RecentActivityComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show every activity when no limit is set', () => {
        expect(cards().length).toBe(3);
        expect(cards()[0].textContent).toContain('added Boat tickets');
    });

    it('should show only the newest ones up to the limit', async () => {
        fixture.componentRef.setInput('limit', 2);
        await fixture.whenStable();

        expect(cards().length).toBe(2);
    });
});
