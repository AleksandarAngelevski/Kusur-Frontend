import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupsService } from '../services/groups.service';
import { loadFakeGroups, ME_ID, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { BalanceComponent } from './balance-component';

describe('BalanceComponent', () => {
  let component: BalanceComponent;
  let fixture: ComponentFixture<BalanceComponent>;
  let groups: GroupsService;

  const figures = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.big, .money')).map((node) => node.textContent!.replace(/\s+/g, ' ').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceComponent],
      providers: [provideFakeGroupsApi()],
    }).compileComponents();

    groups = loadFakeGroups();
    fixture = TestBed.createComponent(BalanceComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should total what I am owed and what I owe across my groups', () => {
    expect(figures()).toEqual(['-2.300 ден', '1.200 ден', '3.500 ден']);
  });

  it('should count what friends owe me too', async () => {
    let tabId = 0;
    let friendId = 0;
    groups.addFriend('stefan').subscribe((tab) => {
      tabId = tab.id;
      friendId = tab.members[1].id;
    });
    groups.addExpense(tabId, { description: 'Lunch', amount: 600, date: new Date(), paidById: ME_ID, splitBetweenIds: [ME_ID, friendId] }).subscribe();
    await fixture.whenStable();

    expect(figures()).toEqual(['-2.000 ден', '1.500 ден', '3.500 ден']);
  });
});
