import { Routes } from '@angular/router';
import { HomeComponent } from './home-component/home-component';
import { LoginComponent } from './login-component/login-component';
import { ForgotPasswordComponent } from './forgot-password-component/forgot-password-component';
import { GroupsComponent } from './groups-component/groups-component';
import { ProfileComponent } from './profile-component/profile-component';
import { RecentActivityComponent } from './recent-activity-component/recent-activity-component';
import { RegisterComponent } from './register-component/register-component';
import { ResetPasswordComponent } from './reset-password-component/reset-password-component';
import { ShellComponent } from './shell-component/shell-component';
import { authGuard, guestGuard } from './shared/auth.guard';


export const routes: Routes = [
    {
        // signed-in pages share the shell, which adds the nav bar
        path: '',
        component: ShellComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: HomeComponent
            },
            {
                path: 'groups',
                component: GroupsComponent
            },
            {
                path: 'activity',
                component: RecentActivityComponent
            },
            {
                path: 'profile',
                component: ProfileComponent
            }
        ]
    },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        component: RegisterComponent,
        canActivate: [guestGuard]
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        canActivate: [guestGuard]
    },
    {
        // no guard: the emailed link has to work whether or not this browser is signed in
        path: 'reset-password',
        component: ResetPasswordComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
