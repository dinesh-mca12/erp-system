import { db } from "../../config/firebase.js";
export const mockChannelsStore = new Map();
export const mockMessagesStore = new Map();
export const mockNotificationsStore = new Map();
const seedDefaultChannelsAndAnnouncements = (companyId) => {
    const defaults = [
        { name: "announcements", type: "announcement", isPrivate: false, members: [] },
        { name: "Accounting", type: "department", department: "Accounting", isPrivate: false, members: [] },
        { name: "Sales", type: "department", department: "Sales", isPrivate: false, members: [] },
        { name: "HR & Payroll", type: "department", department: "HR & Payroll", isPrivate: false, members: [] },
        { name: "General Discussions", type: "team", isPrivate: false, members: [] }
    ];
    const seeded = defaults.map((c, idx) => ({
        id: `chan_seed_${idx + 1}`,
        ...c,
        companyId,
        createdAt: new Date(),
        createdBy: "system",
        updatedAt: new Date(),
        updatedBy: "system",
        isDeleted: false
    }));
    mockChannelsStore.set(companyId, seeded);
    // Seed initial announcements & messages
    const initialMsgs = [
        {
            id: "msg_seed_1",
            channelId: "chan_seed_1", // Announcements
            senderId: "system",
            senderName: "Company Admin",
            text: "📢 Welcome to FlowOS Enterprise Channel! We have successfully deployed the Advanced Work Assignment and Slack-like Internal Communication system modules.",
            reactions: { "🚀": ["Vikram Malhotra", "Admin"] },
            attachments: [],
            isPinned: true,
            companyId,
            createdAt: new Date(Date.now() - 3600000),
            createdBy: "system",
            updatedAt: new Date(Date.now() - 3600000),
            updatedBy: "system",
            isDeleted: false
        },
        {
            id: "msg_seed_2",
            channelId: "chan_seed_2", // Accounting
            senderId: "system",
            senderName: "Finance Head",
            text: "Please verify that the Balance Sheet balances before compiling the July financial closing sheets.",
            reactions: { "👍": ["Vikram Malhotra"] },
            attachments: [],
            companyId,
            createdAt: new Date(Date.now() - 1800000),
            createdBy: "system",
            updatedAt: new Date(Date.now() - 1800000),
            updatedBy: "system",
            isDeleted: false
        }
    ];
    mockMessagesStore.set(companyId, initialMsgs);
    // Seed default notifications
    const initialNotifications = [
        {
            id: "notif_seed_1",
            userId: "mock-user-123",
            title: "Task Assigned",
            message: "You have been assigned a task: 'Reconcile Q2 Banking ledger'. Due date: 2026-08-15.",
            type: "task_assigned",
            read: false,
            companyId,
            createdAt: new Date(),
            createdBy: "system",
            updatedAt: new Date(),
            updatedBy: "system",
            isDeleted: false
        }
    ];
    mockNotificationsStore.set(companyId, initialNotifications);
    return seeded;
};
// ----------------------------------------------------
// CHANNELS CRUD
// ----------------------------------------------------
export const getChannels = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let list = [];
        try {
            const snap = await db.collection("channels").where("companyId", "==", companyId).where("isDeleted", "==", false).get();
            list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, loading channels from mock store.");
            if (!mockChannelsStore.has(companyId)) {
                seedDefaultChannelsAndAnnouncements(companyId);
            }
            list = (mockChannelsStore.get(companyId) || []).filter(c => !c.isDeleted);
        }
        res.json({ success: true, data: list, meta: { total: list.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createChannel = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newChan = {
            ...req.body,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false
        };
        let created;
        try {
            const docRef = await db.collection("channels").add(newChan);
            created = { id: docRef.id, ...newChan };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, creating channel in mock store.");
            const id = "chan_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newChan };
            const list = mockChannelsStore.get(companyId) || [];
            list.push(created);
            mockChannelsStore.set(companyId, list);
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
// ----------------------------------------------------
// MESSAGES & DMs
// ----------------------------------------------------
export const getMessages = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { channelId, receiverId } = req.query;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let msgs = [];
        try {
            let query = db.collection("messages").where("companyId", "==", companyId).where("isDeleted", "==", false);
            if (channelId) {
                query = query.where("channelId", "==", channelId);
            }
            else if (receiverId) {
                // Direct messages between sender and receiver
                query = query.where("senderId", "in", [req.user?.uid, receiverId]).where("receiverId", "in", [req.user?.uid, receiverId]);
            }
            const snap = await query.get();
            msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client side by date
            msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, fetching messages from mock store.");
            const allMsgs = mockMessagesStore.get(companyId) || [];
            if (channelId) {
                msgs = allMsgs.filter(m => m.channelId === channelId && !m.isDeleted);
            }
            else if (receiverId) {
                const myUid = req.user?.uid || "mock-user-123";
                msgs = allMsgs.filter(m => !m.isDeleted && ((m.senderId === myUid && m.receiverId === receiverId) ||
                    (m.senderId === receiverId && m.receiverId === myUid)));
            }
            msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        res.json({ success: true, data: msgs, meta: { total: msgs.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const postMessage = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "system";
        const userName = req.user?.email || "User";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        const newMsg = {
            ...req.body,
            senderId: userId,
            senderName: userName,
            reactions: {},
            isPinned: false,
            isEdited: false,
            companyId,
            createdAt: new Date(),
            createdBy: userId,
            updatedAt: new Date(),
            updatedBy: userId,
            isDeleted: false
        };
        let created;
        try {
            const docRef = await db.collection("messages").add(newMsg);
            created = { id: docRef.id, ...newMsg };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, adding message to mock store.");
            const id = "msg_" + Math.random().toString(36).substring(2, 9);
            created = { id, ...newMsg };
            const list = mockMessagesStore.get(companyId) || [];
            list.push(created);
            mockMessagesStore.set(companyId, list);
        }
        // Handle @mentions scan
        if (newMsg.text.includes("@")) {
            const mentions = newMsg.text.match(/@[a-zA-Z0-9_\-\.]+/g) || [];
            for (const mention of mentions) {
                const username = mention.substring(1);
                // Queue a notification for the mentioned user
                const notif = {
                    userId: "mock-user-123", // Target user mock
                    title: "New Mention",
                    message: `${userName} mentioned you in a chat: "${newMsg.text.substring(0, 40)}..."`,
                    type: "mention",
                    read: false,
                    companyId,
                    createdAt: new Date(),
                    createdBy: userId,
                    updatedAt: new Date(),
                    updatedBy: userId,
                    isDeleted: false
                };
                try {
                    await db.collection("notifications").add(notif);
                }
                catch (e) {
                    const nList = mockNotificationsStore.get(companyId) || [];
                    nList.push({ id: "notif_" + Math.random().toString(36).substring(2, 9), ...notif });
                    mockNotificationsStore.set(companyId, nList);
                }
            }
        }
        res.status(201).json({ success: true, data: created, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const addReaction = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;
        const { emoji } = req.body;
        const userName = req.user?.email || "User";
        if (!companyId || !emoji) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID or emoji is missing." } });
            return;
        }
        let updated = null;
        try {
            const ref = db.collection("messages").doc(id);
            const doc = await ref.get();
            if (doc.exists && doc.data()?.companyId === companyId) {
                const reactions = doc.data()?.reactions || {};
                if (!reactions[emoji])
                    reactions[emoji] = [];
                if (!reactions[emoji].includes(userName)) {
                    reactions[emoji].push(userName);
                }
                await ref.update({ reactions, updatedAt: new Date() });
                const fresh = await ref.get();
                updated = { id: fresh.id, ...fresh.data() };
            }
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, reacting to message in mock store.");
            const list = mockMessagesStore.get(companyId) || [];
            const idx = list.findIndex(m => m.id === id);
            if (idx !== -1) {
                const reactions = list[idx].reactions || {};
                if (!reactions[emoji])
                    reactions[emoji] = [];
                if (!reactions[emoji].includes(userName)) {
                    reactions[emoji].push(userName);
                }
                list[idx].reactions = reactions;
                updated = list[idx];
                mockMessagesStore.set(companyId, list);
            }
        }
        res.json({ success: true, data: updated, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const pinMessage = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;
        const { isPinned } = req.body;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let updated = null;
        try {
            const ref = db.collection("messages").doc(id);
            await ref.update({ isPinned, updatedAt: new Date() });
            const doc = await ref.get();
            updated = { id: doc.id, ...doc.data() };
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, pinning message in mock store.");
            const list = mockMessagesStore.get(companyId) || [];
            const idx = list.findIndex(m => m.id === id);
            if (idx !== -1) {
                list[idx].isPinned = isPinned;
                updated = list[idx];
                mockMessagesStore.set(companyId, list);
            }
        }
        res.json({ success: true, data: updated, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------
export const getNotifications = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.uid || "mock-user-123";
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let list = [];
        try {
            const snap = await db.collection("notifications").where("companyId", "==", companyId).where("userId", "==", userId).where("isDeleted", "==", false).get();
            list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, loading notifications from mock store.");
            list = (mockNotificationsStore.get(companyId) || []).filter(n => n.userId === userId && !n.isDeleted);
        }
        res.json({ success: true, data: list, meta: { total: list.length }, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const markNotificationRead = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        const { id } = req.params;
        if (!companyId) {
            res.status(400).json({ success: false, data: null, error: { code: "BAD_REQUEST", message: "Company ID is missing." } });
            return;
        }
        let success = false;
        try {
            const ref = db.collection("notifications").doc(id);
            await ref.update({ read: true, updatedAt: new Date() });
            success = true;
        }
        catch (e) {
            console.warn("[FlowOS API] Firestore offline, marking notification read in mock store.");
            const list = mockNotificationsStore.get(companyId) || [];
            const idx = list.findIndex(n => n.id === id);
            if (idx !== -1) {
                list[idx].read = true;
                mockNotificationsStore.set(companyId, list);
                success = true;
            }
        }
        res.json({ success, data: null, meta: null, error: null });
    }
    catch (error) {
        next(error);
    }
};
export const createChannelMessage = postMessage;
//# sourceMappingURL=communication.controller.js.map