import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { ProfileComponent } from './profile-component';

/** A token shaped like the backend's: only the payload matters here. */
const tokenFor = (payload: object) => `header.${btoa(JSON.stringify(payload))}.signature`;

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let auth: AuthService;

  const title = () => (fixture.nativeElement as HTMLElement).querySelector('.title')?.textContent?.trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(ProfileComponent);
  });

  it('should show the username from the token', async () => {
    auth.token.set(tokenFor({ sub: 'ace' }));
    await fixture.whenStable();

    expect(title()).toBe('ace');
  });

  it('should fall back when the token cannot be read', async () => {
    auth.token.set('not-a-jwt');
    await fixture.whenStable();

    expect(title()).toBe('Unknown');
  });
});
