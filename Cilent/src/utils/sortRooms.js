/**
 * sortRooms.js
 * Natural-order room sorting utility.
 *
 * Sorts rooms so "Room 2" < "Room 10" < "Room 100"
 * instead of the default lexicographic "Room 10" < "Room 2".
 *
 * Works with any naming format: "1", "Room 1", "A1", "Block B Room 3".
 */

/**
 * Sort an array of room objects in ascending natural order.
 * @param {Array} rooms
 * @returns {Array} sorted copy
 */
export const sortRoomsAscending = (rooms) => {
  if (!Array.isArray(rooms)) return [];
  return [...rooms].sort((a, b) => {
    const numA = parseInt((a.room_number || '').replace(/\D+/g, ''), 10);
    const numB = parseInt((b.room_number || '').replace(/\D+/g, ''), 10);

    // Both numeric — compare as integers
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }

    // Fall back to locale-aware sort for non-numeric or equal numbers
    return (a.room_number || '').localeCompare(b.room_number || '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
};

/**
 * Group rooms by property, each group sorted ascending.
 * @param {Array} rooms
 * @returns {{ [propertyName: string]: Array }}
 */
export const groupRoomsByProperty = (rooms) => {
  const sorted = sortRoomsAscending(rooms);
  return sorted.reduce((groups, room) => {
    const key = room.property_name || 'Unknown Property';
    if (!groups[key]) groups[key] = [];
    groups[key].push(room);
    return groups;
  }, {});
};
