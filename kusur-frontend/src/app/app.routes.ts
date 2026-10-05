import { Routes } from '@angular/router';
import { ExpenseFormComponent } from './expense-form-component/expense-form-component';
import { CreateGroupComponent } from './create-group-component/create-group-component';
import { GroupDetailsComponent } from './group-details-component/group-details-component';
import { GroupSettingsComponent } from './group-settings-component/group-settings-component';
import { HomeComponent } from './home-component/home-component';
import { LoginComponent } from './login-component/login-component';
import { ForgotPasswordComponent } from './forgot-password-component/forgot-password-component';
import { GroupsComponent } from './groups-component/groups-component';
import { ProfileComponent } from './profile-component/profile-component';
import { RecentActivityComponent } from './recent-activity-component/recent-activity-component';
import { RegisterComponent } from './register-component/register-component';
import { ResetPasswordComponent } from './reset-password-component/reset-password-component';
import { SettleUpComponent } from './settle-up-component/settle-up-component';
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
                // listed before groups/:id so "new" isn't read as an id
                path: 'groups/new',
                component: CreateGroupComponent
            },
            {
                path: 'groups/:id',
                component: GroupDetailsComponent
            },
            {
                path: 'groups/:id/expenses/new',
                component: ExpenseFormComponent
            },
            {
                path: 'groups/:id/expenses/:expenseId/edit',
                component: ExpenseFormComponent
            },
            {
                path: 'groups/:id/settings',
                component: GroupSettingsComponent
            },
            {
                path: 'groups/:id/settle',
                component: SettleUpComponent
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
