use super::detector::{has_conflicts, list_conflicted_files};
use super::extractor::{extract_conflict_details, parse_conflict_markers};
use super::resolver::resolve_conflicted_file;
use git2::{Repository, Signature};
use std::fs;
use tempfile::TempDir;

#[test]
fn test_parse_conflict_markers() {
    let mock_content = r#"Header line
<<<<<<< HEAD
Our version line
=======
Their version line
>>>>>>> feature
Footer line
"#;

    let blocks = parse_conflict_markers(mock_content);
    assert_eq!(blocks.len(), 1);
    assert_eq!(blocks[0].id, 1);
    assert_eq!(blocks[0].ours, "Our version line");
    assert_eq!(blocks[0].theirs, "Their version line");
}

#[test]
fn test_simulate_conflict_and_resolution() {
    let temp_dir = TempDir::new().expect("Temp dir");
    let repo = Repository::init(temp_dir.path()).expect("Init repo");
    let sig = Signature::now("Tester", "tester@test.com").expect("Sig");

    let file_path = temp_dir.path().join("file.txt");

    // 1. Initial commit on main
    fs::write(&file_path, "base line 1\nbase line 2\n").expect("write");
    let mut index = repo.index().expect("index");
    index
        .add_path(std::path::Path::new("file.txt"))
        .expect("add");
    let tree_id = index.write_tree().expect("tree");
    let tree = repo.find_tree(tree_id).expect("find tree");
    let initial_commit = repo
        .commit(Some("HEAD"), &sig, &sig, "initial", &tree, &[])
        .expect("commit initial");
    let initial_obj = repo.find_commit(initial_commit).expect("find commit");
    let main_branch_ref = repo.head().expect("head ref").name().unwrap().to_string();

    // 2. Create feature branch
    let feature_branch = repo
        .branch("feature", &initial_obj, false)
        .expect("create branch");
    let feature_ref = feature_branch.into_reference();

    // 3. Commit change on main
    fs::write(&file_path, "base line 1\nMODIFIED ON MAIN\n").expect("write main");
    index
        .add_path(std::path::Path::new("file.txt"))
        .expect("add main");
    let main_tree_id = index.write_tree().expect("tree main");
    let main_tree = repo.find_tree(main_tree_id).expect("find tree main");
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        "commit on main",
        &main_tree,
        &[&initial_obj],
    )
    .expect("commit main");

    // 4. Switch to feature branch and commit conflicting change
    repo.set_head(feature_ref.name().unwrap())
        .expect("set head feature");
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .expect("checkout feature");

    fs::write(&file_path, "base line 1\nMODIFIED ON FEATURE\n").expect("write feature");
    let mut feat_index = repo.index().expect("feat index");
    feat_index
        .add_path(std::path::Path::new("file.txt"))
        .expect("add feat");
    let feat_tree_id = feat_index.write_tree().expect("tree feat");
    let feat_tree = repo.find_tree(feat_tree_id).expect("find tree feat");
    let feat_commit_id = repo
        .commit(
            Some("HEAD"),
            &sig,
            &sig,
            "commit on feature",
            &feat_tree,
            &[&initial_obj],
        )
        .expect("commit feat");

    // 5. Switch back to main and merge feature (will produce conflict)
    repo.set_head(&main_branch_ref).expect("set head main");
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .expect("checkout main");

    let feat_annotated = repo
        .find_annotated_commit(feat_commit_id)
        .expect("annotated commit");

    // Perform merge
    repo.merge(&[&feat_annotated], None, None).expect("merge");

    // 6. Verify conflict detected
    assert!(has_conflicts(&repo), "Repository should have conflicts");
    let conflicted_files = list_conflicted_files(&repo).expect("list conflicted");
    assert_eq!(conflicted_files, vec!["file.txt"]);

    // 7. Extract conflict details
    let details = extract_conflict_details(&repo, "file.txt").expect("extract");
    assert_eq!(details.path, "file.txt");
    assert!(details.ours_content.contains("MODIFIED ON MAIN"));
    assert!(details.theirs_content.contains("MODIFIED ON FEATURE"));

    // 8. Resolve conflict
    let resolved = "base line 1\nRESOLVED MANUALLY\n";
    resolve_conflicted_file(&repo, "file.txt", resolved).expect("resolve");

    // 9. Verify conflict cleared
    assert!(!has_conflicts(&repo), "Conflicts should now be cleared");
}
