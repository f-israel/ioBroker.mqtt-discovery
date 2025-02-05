export async function findStatesMarkedWithEnum(adapter: ioBroker.Adapter, enumId: string): Promise<string[]> {
    const resolveToStateIds = async (objId: string): Promise<string[]> => {
        const obj = await adapter.getForeignObjectAsync(objId);
        if (!obj) return [];

        switch (obj.type) {
            case "state":
                return [obj._id];
            case "channel":
            case "device":
            case "folder":
            case "meta":
            case "adapter":
            case "instance":
            case "group":
                break;
            case "enum":
            case "host":
            case "user":
            case "script":
            case "chart":
            case "schedule":
            case "config":
            case "design":
                adapter.log.warn(`Found object of type '${obj.type}' which is not supported`);
                return [];
        }

        //getting here means we have a kind of state container and can recurse

        adapter.log.debug(`Found object '${obj._id}' of type '${obj.type}' - searching for members`);

        const distinctList: string[] = [];
        for (const stateId in await adapter.getForeignStatesAsync(`${obj._id}.*`)) {
            if (!distinctList.includes(stateId)) distinctList.push(stateId);
        }
        return distinctList;
    };
    const enumObj = await adapter.getForeignObjectAsync(`enum.functions.${enumId}`);
    let stateIds: string[] = [];
    for (const member of enumObj?.common.members ?? []) {
        stateIds = [...stateIds, ...(await resolveToStateIds(member))];
    }
    return stateIds;
}
