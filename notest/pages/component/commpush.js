/**
 * CommPush - 通用API调用组件
 * 封装所有API调用，提供统一的接口调用方式
 * 用于替代页面中直接的API调用，便于统一管理
 */

class CommPush {
    constructor() {
        // 确保API实例已初始化
        this.api = window.api || new API();
        window.api = this.api;
    }

    /**
     * 笔记相关操作
     */
    async getNotes(params = {}) {
        return this.api.getNotes(params);
    }

    async getNoteById(noteId) {
        return this.api.getNoteById(noteId);
    }

    /**
     * saveMarkdown - 保存Markdown文件
     * @param {String} fileName - 文件名
     * @param {String} content - 文件内容 
     * @param {String} title - 笔记标题
     */
    async saveMarkdown(fileName, content, title) {
        return this.api.saveMarkdown(fileName, content, title);
    }
    
    
    /**
     * getNote - 获取笔记详情 (作为 getNoteById 的别名)
     * @param {String} noteId - 笔记ID
     * @returns {Promise} 包含笔记数据的Promise
     */
    async getNote(noteId) {
        return this.getNoteById(noteId);
    }

    async createNote(noteData) {
        return this.api.createNote(noteData);
    }

    async updateNote(noteId, noteData) {
        return this.api.updateNote(noteId, noteData);
    }

    async deleteNote(noteId) {
        return this.api.deleteNote(noteId);
    }

    /**
     * deleteNotePermanently - 永久删除笔记 (作为 deleteNote 的别名)
     * @param {String} noteId - 笔记ID
     * @returns {Promise} 包含删除结果的Promise
     */
    async deleteNotePermanently(noteId) {
        return this.deleteNote(noteId);
    }

    async trashNote(noteId) {
        return this.api.trashNote(noteId);
    }

    async restoreNote(noteId) {
        return this.api.restoreNote(noteId);
    }

    /**
     * restoreNoteFromTrash - 从回收站恢复笔记 (作为 restoreNote 的别名)
     * @param {String} noteId - 笔记ID
     * @returns {Promise} 包含恢复结果的Promise
     */
    async restoreNoteFromTrash(noteId) {
        return this.restoreNote(noteId);
    }

    async starNote(noteId) {
        return this.api.starNote(noteId);
    }

    async unstarNote(noteId) {
        return this.api.unstarNote(noteId);
    }

    async getStarredNotes() {
        return this.api.getStarredNotes();
    }

    async getTrashedNotes() {
        return this.api.getTrashedNotes();
    }

    /**
     * 分类相关操作
     */
    async getCategories() {
        return this.api.getCategories();
    }

    async createCategory(categoryData) {
        return this.api.createCategory(categoryData);
    }

    async updateCategory(categoryId, categoryData) {
        return this.api.updateCategory(categoryId, categoryData);
    }

    async deleteCategory(categoryId) {
        return this.api.deleteCategory(categoryId);
    }

    async updateNoteCategory(noteId, categoryId) {
        return this.api.updateNoteCategory(noteId, categoryId);
    }

    /**
     * 标签相关操作
     */
    async getTags() {
        return this.api.getTags();
    }

    async getNotesByTag(tagId) {
        return this.api.getNotesByTag(tagId);
    }

    async createTag(tagData) {
        return this.api.createTag(tagData);
    }

    async updateTag(tagId, tagData) {
        return this.api.updateTag(tagId, tagData);
    }

    async deleteTag(tagId) {
        return this.api.deleteTag(tagId);
    }

    async updateNoteTags(noteId, tagIds) {
        return this.api.updateNoteTags(noteId, tagIds);
    }

    /**
     * 分享相关操作
     */
    async shareNote(noteId, shareType, password, expiry) {
        return this.api.shareNote(noteId, shareType, password, expiry);
    }

    async getSharedNotes() {
        return this.api.getSharedNotes();
    }

    async updateShareSettings(shareId, shareData) {
        return this.api.updateShareSettings(shareId, shareData);
    }

    async removeShare(shareId) {
        return this.api.removeShare(shareId);
    }

    /**
     * 用户相关操作
     */
    async login(username, password, remember = false) {
        return this.api.login(username, password, remember);
    }

    async register(userData) {
        return this.api.register(userData);
    }

    async getCurrentUser() {
        return this.api.getCurrentUser();
    }

    async logout() {
        return this.api.logout();
    }

    async updateProfile(userData) {
        return this.api.updateProfile(userData);
    }

    async changePassword(passwordData) {
        return this.api.changePassword(passwordData);
    }

    /**
     * 文件上传相关操作
     */
    async uploadFile(formData) {
        return this.api.uploadFile(formData);
    }

    async deleteFile(fileId) {
        return this.api.deleteFile(fileId);
    }

    /**
     * 用户设置相关操作
     */
    async getUserSettings() {
        return this.api.getUserSettings();
    }

    async updateUserSettings(settingsData) {
        return this.api.updateUserSettings(settingsData);
    }

    /**
     * 站点设置相关操作
     */
    async getSiteSettings() {
        return this.api.getSiteSettings();
    }

    async updateSiteSettings(siteSettingsData) {
        return this.api.updateSiteSettings(siteSettingsData);
    }

    /**
     * 安全设置相关操作
     */
    async getSecuritySettings() {
        return this.api.getSecuritySettings();
    }

    async updateSecuritySettings(securitySettingsData) {
        return this.api.updateSecuritySettings(securitySettingsData);
    }

    /**
     * 备份设置相关操作
     */
    async getBackupSettings() {
        return this.api.getBackupSettings();
    }

    async updateBackupSettings(backupSettingsData) {
        return this.api.updateBackupSettings(backupSettingsData);
    }

    async createBackup() {
        return this.api.createBackup();
    }

    async restoreBackup(formData) {
        return this.api.restoreBackup(formData);
    }

    /**
     * 高级设置相关操作
     */
    async getAdvancedSettings() {
        return this.api.getAdvancedSettings();
    }

    async updateAdvancedSettings(advancedSettingsData) {
        return this.api.updateAdvancedSettings(advancedSettingsData);
    }
}

// 创建全局单例实例
window.commpush = window.commpush || new CommPush();

// 导出CommPush类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommPush;
}