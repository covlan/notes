const express = require('express');
const {
  createNote,
  getNotes,
  getNote,
  updateNote,
  starNote,
  trashNote,
  restoreNote,
  deleteNote,
  emptyTrash,
  saveMarkdown
} = require('../controllers/notes');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 笔记路由
router.route('/')
  .get(getNotes)
  .post(createNote);

router.route('/empty-trash')
  .delete(emptyTrash);

router.route('/save-markdown')
  .post(saveMarkdown);

router.route('/:id')
  .get(getNote)
  .put(updateNote)
  .delete(deleteNote);

router.route('/:id/star')
  .put(starNote)
  .post(starNote);

router.route('/:id/trash')
  .put(trashNote)
  .post(trashNote);

router.route('/:id/restore')
  .put(restoreNote)
  .post(restoreNote);

module.exports = router; 