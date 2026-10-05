import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { GroupsService } from '../services/groups.service';

/** Fetches every group before an admin page that shows or edits one of them renders. */
export const adminGroupsResolver: ResolveFn<void> = () => inject(GroupsService).loadAllGroups();
