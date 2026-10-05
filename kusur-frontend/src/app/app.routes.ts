import { Routes } from '@angular/router';
import { ExpenseFormComponent } from './expense-form-component/expense-form-component';
import { AdminComponent } from './admin-component/admin-component';
import { AdminGroupComponent } from './admin-group-component/admin-group-component';
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
import { adminGroupsResolver } from './shared/admin-groups.resolver';
import { adminGuard, authGuard, guestGuard } from './shared/auth.guard';
import { groupsResolver } from './shared/groups.resolver';


export const routes: Routes = [
    {
        // signed-in pages share the shell, which adds the nav bar
        path: '',
        component: ShellComponent,
        canActivate: [authGuard],
        resolve: { groups: groupsResolver },
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
            },
            {
                path: 'admin',
                component: AdminComponent,
                canActivate: [adminGuard]
            },
            {
                path: 'admin/groups/:id',
                component: AdminGroupComponent,
                canActivate: [adminGuard],
                resolve: { allGroups: adminGroupsResolver }
            },
            {
                // the same form members use; `admin` sends it back to the admin view afterwards
                path: 'admin/groups/:id/expenses/:expenseId/edit',
                component: ExpenseFormComponent,
                canActivate: [adminGuard],
                resolve: { allGroups: adminGroupsResolver },
                data: { admin: true }
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
