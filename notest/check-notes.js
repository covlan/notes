// Get notes from localStorage and count those in trash
const notes = JSON.parse(localStorage.getItem('notes') || '[]');
const trashCount = notes.filter(note => note.inTrash).length;

// Log results
console.log(`Total notes: ${notes.length}`);
console.log(`Notes in trash: ${trashCount}`);
console.log(`Notes not in trash: ${notes.length - trashCount}`);

// Check for starred notes
const starredCount = notes.filter(note => note.isStarred).length;
console.log(`Starred notes: ${starredCount}`);

// Check for shared notes
const sharedCount = notes.filter(note => note.isShared || note.shared).length;
console.log(`Shared notes: ${sharedCount}`); 