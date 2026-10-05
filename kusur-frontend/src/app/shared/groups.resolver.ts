import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { GroupsService } from '../services/groups.service';

/** Holds the signed-in pages back until the groups have been fetched, so they can read them straight away. */
export const groupsResolver: ResolveFn<void> = () => inject(GroupsService).ensureLoaded();
