const test = require("node:test");
const assert = require("node:assert/strict");

const calls = [];
let failOn = null;
let userExists = true;
let committed = false;
let rolledBack = false;
let released = false;

const databasePath = require.resolve("../src/config/database");
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    getConnection: async () => ({
      beginTransaction: async () => {},
      query: async (sql, params) => {
        calls.push({ sql, params });
        if (failOn && sql.includes(failOn)) throw new Error("database failed");
        if (sql.includes("FOR UPDATE")) return [userExists ? [{ id: 7 }] : []];
        return [{ affectedRows: 1 }];
      },
      commit: async () => { committed = true; },
      rollback: async () => { rolledBack = true; },
      release: () => { released = true; },
    }),
  },
};

const UserModel = require("../src/models/userModel");

const reset = () => {
  calls.length = 0;
  failOn = null;
  userExists = true;
  committed = false;
  rolledBack = false;
  released = false;
};

test("permanent deletion removes personal data and detaches shared history in one transaction", async () => {
  reset();
  assert.equal(await UserModel.delete(7), true);
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
  assert.equal(released, true);
  assert.equal(calls[0].sql.includes("FOR UPDATE"), true);
  assert.equal(calls.at(-1).sql, "DELETE FROM Users WHERE id = ?");
  assert.deepEqual(calls.map(({ sql }) => sql.match(/^(DELETE FROM|UPDATE) \w+/)?.[0]).filter(Boolean), [
    "DELETE FROM AIAnalysis",
    "DELETE FROM Bookings",
    "DELETE FROM Notifications",
    "DELETE FROM ActivityLogs",
    "UPDATE DeviceStatusHistory",
    "UPDATE RoomStatusHistory",
    "UPDATE Incidents",
    "UPDATE Maintenance",
    "UPDATE Maintenance",
    "DELETE FROM Users",
  ]);
  assert.equal(calls.every(({ params }) => params[0] === 7), true);
});

test("deletion rolls back every change when a related table fails", async () => {
  reset();
  failOn = "DELETE FROM Notifications";
  await assert.rejects(UserModel.delete(7), /database failed/);
  assert.equal(committed, false);
  assert.equal(rolledBack, true);
  assert.equal(released, true);
  assert.equal(calls.some(({ sql }) => sql === "DELETE FROM Users WHERE id = ?"), false);
});

test("deletion reports missing accounts without changing other rows", async () => {
  reset();
  userExists = false;
  assert.equal(await UserModel.delete(7), false);
  assert.equal(committed, false);
  assert.equal(rolledBack, true);
  assert.equal(released, true);
  assert.equal(calls.length, 1);
});
