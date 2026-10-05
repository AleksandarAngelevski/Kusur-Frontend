import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupCard } from './group-card';

describe('GroupCard', () => {
  let component: GroupCard;
  let fixture: ComponentFixture<GroupCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupCard],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('group', { id: 1, name: 'Ohrid Trip', memberCount: 4, balance: 1200 });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
