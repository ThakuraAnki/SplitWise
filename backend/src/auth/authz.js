import { NotFoundError, ForbiddenError } from "../utils/errorUtils.js";

export async function assertMembership(repo, groupId, userEmail) {
    const group = await repo.getGroup(groupId);

    if (!group) {
        throw new NotFoundError(`Group ${groupId} not found`);
    }

    // Only check membership if a user is authenticated
    if (userEmail && !group.memberIds.includes(userEmail)) {
        throw new ForbiddenError("You are not a part of this group");
    }

    return group;
}