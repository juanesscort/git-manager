use super::*;
use crate::models::git_models::FileStatusKind;
use git2::Repository;
use std::fs;
use tempfile::TempDir;

fn setup_temp_repo() -> (TempDir, Repository) {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let repo = Repository::init(temp_dir.path()).expect("Failed to init git repo");
    (temp_dir, repo)
}

#[test]
fn test_open_and_summary() {
    let (temp_dir, repo) = setup_temp_repo();
    let opened = open_repository(temp_dir.path()).expect("Failed to open repo");
    assert_eq!(opened.path(), repo.path());

    let summary = get_repo_summary(&opened).expect("Failed to get summary");
    assert!(summary.is_empty);
    assert!(!summary.is_bare);
}

#[test]
fn test_staging_and_status() {
    let (temp_dir, repo) = setup_temp_repo();
    let file_path = temp_dir.path().join("hello.txt");
    fs::write(&file_path, "Hello Git-Manager!").expect("Failed to write test file");

    // Check status: should be Untracked
    let statuses = get_repo_statuses(&repo).expect("Failed to get statuses");
    assert_eq!(statuses.len(), 1);
    assert_eq!(statuses[0].path, "hello.txt");
    assert_eq!(statuses[0].unstaged_status, Some(FileStatusKind::Untracked));
    assert_eq!(statuses[0].staged_status, None);

    // Stage file
    stage_file(&repo, "hello.txt").expect("Failed to stage file");

    // Check status: should now be Staged (Added)
    let statuses_after = get_repo_statuses(&repo).expect("Failed to get statuses");
    assert_eq!(statuses_after.len(), 1);
    assert_eq!(statuses_after[0].staged_status, Some(FileStatusKind::Added));
    assert_eq!(statuses_after[0].unstaged_status, None);

    // Unstage file
    unstage_file(&repo, "hello.txt").expect("Failed to unstage file");
    let statuses_unstage = get_repo_statuses(&repo).expect("Failed to get statuses");
    assert_eq!(statuses_unstage.len(), 1);
    assert_eq!(statuses_unstage[0].staged_status, None);
    assert_eq!(
        statuses_unstage[0].unstaged_status,
        Some(FileStatusKind::Untracked)
    );
}

#[test]
fn test_commit_and_history() {
    let (temp_dir, repo) = setup_temp_repo();
    let file_path = temp_dir.path().join("code.rs");
    fs::write(&file_path, "fn main() {}").expect("Failed to write file");

    stage_file(&repo, "code.rs").expect("Failed to stage");
    let commit_oid = create_commit(
        &repo,
        "feat: initial commit in test",
        Some("Tester"),
        Some("tester@example.com"),
    )
    .expect("Failed to create commit");

    assert!(!commit_oid.is_empty());

    let history = get_commit_history(&repo, 10).expect("Failed to fetch history");
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].oid, commit_oid);
    assert_eq!(history[0].summary, "feat: initial commit in test");
    assert_eq!(history[0].author_name, "Tester");
}

#[test]
fn test_diff_calculation() {
    let (temp_dir, repo) = setup_temp_repo();
    let file_path = temp_dir.path().join("doc.md");
    fs::write(&file_path, "Line 1\nLine 2\n").expect("Failed to write doc");

    stage_file(&repo, "doc.md").expect("Failed to stage doc");
    create_commit(&repo, "docs: add doc.md", None, None).expect("Commit doc");

    // Modify file
    fs::write(&file_path, "Line 1\nLine 2 modified\nLine 3 added\n").expect("Modify doc");

    // Check unstaged diff
    let diff = get_file_diff(&repo, "doc.md", false).expect("Get unstaged diff");
    assert_eq!(diff.lines_added, 2);
    assert_eq!(diff.lines_deleted, 1);
    assert!(diff.patch.contains("+Line 3 added"));

    // Stage and check staged diff
    stage_file(&repo, "doc.md").expect("Stage modified");
    let staged_diff = get_file_diff(&repo, "doc.md", true).expect("Get staged diff");
    assert_eq!(staged_diff.lines_added, 2);
    assert_eq!(staged_diff.lines_deleted, 1);

    // Full staged diff string
    let full_patch = get_staged_diff_full(&repo).expect("Get full patch");
    assert!(full_patch.contains("+Line 3 added"));
}

#[test]
fn test_branches_and_commit_changes() {
    let (temp_dir, repo) = setup_temp_repo();
    let file_path = temp_dir.path().join("file.txt");
    fs::write(&file_path, "Hello world\n").expect("write file");

    stage_file(&repo, "file.txt").expect("stage file");
    let oid = create_commit(&repo, "feat: init", None, None).expect("commit");

    // Test branches
    let branches = get_branches(&repo).expect("get branches");
    assert_eq!(branches.local.len(), 1);
    assert!(branches.local[0].is_head);

    // Test commit changed files
    let changes = get_commit_changed_files(&repo, &oid).expect("get commit files");
    assert_eq!(changes.len(), 1);
    assert_eq!(changes[0].path, "file.txt");
    assert_eq!(changes[0].status, FileStatusKind::Added);
    assert_eq!(changes[0].lines_added, 1);

    // Test commit file diff
    let file_diff = get_commit_file_diff(&repo, &oid, "file.txt").expect("get commit file diff");
    assert_eq!(file_diff.path, "file.txt");
    assert!(file_diff.patch.contains("+Hello world"));
}

#[test]
fn test_git_clone_local() {
    let (source_dir, repo) = setup_temp_repo();
    let file_path = source_dir.path().join("readme.md");
    fs::write(&file_path, "# Cloned Repo\n").expect("write file");
    stage_file(&repo, "readme.md").expect("stage file");
    create_commit(&repo, "feat: initial commit", None, None).expect("commit");

    let target_dir = tempfile::tempdir().expect("temp target dir");
    let cloned_path = target_dir.path().join("clone_destination");

    let source_path_str = source_dir.path().to_str().expect("source path");
    let target_path_str = cloned_path.to_str().expect("target path");

    let result = crate::core::git_engine::git_clone(source_path_str, target_path_str);
    assert!(result.is_ok(), "git_clone should succeed for local repo");

    let cloned_repo =
        crate::core::git_engine::open_repository(&cloned_path).expect("open cloned repo");
    let cloned_summary =
        crate::core::git_engine::get_repo_summary(&cloned_repo).expect("summary of cloned repo");
    assert!(!cloned_summary.is_empty);
}

#[test]
fn test_tags_creation_listing_deletion() {
    let (temp_dir, repo) = setup_temp_repo();
    let file_path = temp_dir.path().join("tag_test.txt");
    fs::write(&file_path, "version 0.1.0\n").expect("write file");
    stage_file(&repo, "tag_test.txt").expect("stage file");
    let commit_oid = create_commit(&repo, "feat: tag target", None, None).expect("commit");

    // 1. Initially no tags
    let initial_tags = list_tags(&repo).expect("list empty tags");
    assert_eq!(initial_tags.len(), 0);

    // 2. Create lightweight tag
    let tag_light =
        create_tag(&repo, "v0.1.0-light", &commit_oid, None).expect("create lightweight tag");
    assert_eq!(tag_light.name, "v0.1.0-light");
    assert!(!tag_light.is_annotated);

    // 3. Create annotated tag
    let tag_annotated = create_tag(
        &repo,
        "v0.1.0",
        &commit_oid,
        Some("First official release of GitManager PRO"),
    )
    .expect("create annotated tag");
    assert_eq!(tag_annotated.name, "v0.1.0");
    assert!(tag_annotated.is_annotated);
    assert_eq!(
        tag_annotated.message.as_deref(),
        Some("First official release of GitManager PRO")
    );

    // 4. List tags: should contain 2 tags
    let tags = list_tags(&repo).expect("list tags");
    assert_eq!(tags.len(), 2);

    // 5. Delete lightweight tag
    delete_tag(&repo, "v0.1.0-light").expect("delete tag");
    let tags_after_delete = list_tags(&repo).expect("list tags after delete");
    assert_eq!(tags_after_delete.len(), 1);
    assert_eq!(tags_after_delete[0].name, "v0.1.0");
}
