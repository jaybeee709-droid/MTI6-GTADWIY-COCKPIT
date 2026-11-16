/* MTI6-GTADWIY-COCKPIT — Good-Person Naming Pool (owner-controlled scriptural registry)
 *
 * DATA REGISTRY ONLY. No worker spawning, no execution, no network, no
 * secrets. Dynamic Tribe workers receive canonical names from this pool;
 * the pool itself names nobody and spawns nothing.
 *
 * Owner ruling (05:56 EST Nov 14, 2026): the larger 120+ pool is built
 * from good people in owner-approved scriptural sources, male and female.
 * Every entry records canonicalName, sourceBook, sourceReference,
 * sourceTier, duplicateStatus, DanielApprovalState, sex, and notes.
 * Source tiers are closed: KJV / APOCRYPHA /
 * OTHER_OWNER_APPROVED_SCRIPTURAL_SOURCE.
 *
 * Approval honesty:
 *   - APPROVED is reserved for the three names the owner approved by
 *     name on record: Solomon, Jacob, David. No other entry is APPROVED.
 *   - PENDING entries carry an exact "Book chapter:verse" reference for
 *     a passage where the person is presented positively. A reference is
 *     recorded only when it is known confidently; nothing is guessed.
 *   - REQUIRES_VERIFICATION entries have sourceReference null. Their
 *     goodness or source status is not yet confirmed; the owner confirms
 *     or removes them. Never guess a reference.
 *   - Angels are NOT in this pool: they have a separate registry
 *     (js/angel-identities.js). This pool is human-form workers only.
 *
 * Coverage honesty: TARGET is 120. This first batch has fewer entries,
 * so summary().state is "PARTIAL" and must stay PARTIAL until the pool
 * genuinely reaches 120 entries with zero validation errors. The state
 * is computed, never hand-written.
 *
 * Load order: after js/truth.js (this file maps approval states onto the
 * Truth vocabulary through global.Truth when it is present, and falls
 * back to a local list when it is not). It loads after the other
 * js/data files; it depends on js/truth.js only. It loads in a bare vm
 * context with no DOM and no network.
 */
(function (global) {
  "use strict";

  var TARGET = 120;

  var SOURCE_TIERS = ["KJV", "APOCRYPHA",
    "OTHER_OWNER_APPROVED_SCRIPTURAL_SOURCE"];

  var APPROVAL_STATES = ["APPROVED", "PENDING", "REQUIRES_VERIFICATION"];

  // Availability states for the spec field names (owner spec §44).
  // AVAILABLE is the default: the name is free to be assigned. A name
  // is never assigned while UNAVAILABLE or RESERVED. "NAME_PENDING" is
  // NOT an availability state — it is a worker's canonicalName when no
  // name has been approved yet, and it never appears here.
  var AVAILABILITY_STATES = ["AVAILABLE", "UNAVAILABLE", "RESERVED"];

  var SEXES = ["MALE", "FEMALE", "UNKNOWN"];

  // The only three names the owner has approved by name on record.
  // validatePool() rejects any other APPROVED entry.
  var APPROVED_NAMES = ["Solomon", "Jacob", "David"];

  // "Book chapter:verse" form. Book may carry a leading number
  // ("1 Kings", "2 Samuel", "3 John") and multi-word names.
  var REFERENCE_PATTERN = /^(?:[123] )?[A-Za-z]+(?: [A-Za-z]+)* \d+:\d+$/;

  // Approval state -> Truth vocabulary. APPROVED means the owner has
  // confirmed the name, so it maps to VERIFIED; PENDING is recorded but
  // not yet owner-confirmed, so UNVERIFIED; REQUIRES_VERIFICATION is
  // UNKNOWN until the owner (or a confirmed source) settles it.
  var APPROVAL_TO_TRUTH = {
    APPROVED: "VERIFIED",
    PENDING: "UNVERIFIED",
    REQUIRES_VERIFICATION: "UNKNOWN"
  };

  // Local fallback for the Truth states, used only when global.Truth
  // is not loaded (e.g. a bare vm test that loads this file alone).
  var FALLBACK_TRUTH_STATES = ["NOT_CONNECTED", "UNKNOWN", "UNVERIFIED",
    "STALE", "DISABLED", "UNAVAILABLE", "VERIFIED", "LIVE"];

  function truthStateFor(approvalState) {
    var mapped = APPROVAL_TO_TRUTH[approvalState];
    if (mapped === undefined) return null;
    if (global.Truth && typeof global.Truth.isKnownTruthState === "function") {
      return global.Truth.isKnownTruthState(mapped) ? mapped : null;
    }
    return FALLBACK_TRUTH_STATES.indexOf(mapped) !== -1 ? mapped : null;
  }

  // Entry shape:
  //   canonicalName, nameId (stable id, "name-" + slug of the name),
  //   sourceBook, sourceReference (exact "Book ch:v" or null when
  //   REQUIRES_VERIFICATION), sourceTier, duplicateStatus
  //   ("UNIQUE" / "DUPLICATE_OF:<name>" / "VARIANT_OF:<name>"),
  //   duplicateState (spec name, mirrors duplicateStatus),
  //   DanielApprovalState, approvalState (spec name, mirrors
  //   DanielApprovalState), availabilityState (AVAILABLE / UNAVAILABLE
  //   / RESERVED; default AVAILABLE), sex, notes.
  // The historical field names (duplicateStatus, DanielApprovalState)
  // are kept as aliases so existing callers keep working; the spec
  // names are the canonical ones.
  var ENTRIES = [
    // --- APPROVED (owner-approved by name; these three only) ---
    { canonicalName: "Solomon", nameId: "name-solomon", sourceBook: "1 Kings", sourceReference: "1 Kings 3:5", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "APPROVED", approvalState: "APPROVED", availabilityState: "AVAILABLE", sex: "MALE", notes: "Asked God for an understanding heart rather than riches or long life." },
    { canonicalName: "Jacob", nameId: "name-jacob", sourceBook: "Genesis", sourceReference: "Genesis 28:11", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "APPROVED", approvalState: "APPROVED", availabilityState: "AVAILABLE", sex: "MALE", notes: "At Bethel, where God renewed the covenant promise to him." },
    { canonicalName: "David", nameId: "name-david", sourceBook: "1 Samuel", sourceReference: "1 Samuel 16:13", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "APPROVED", approvalState: "APPROVED", availabilityState: "AVAILABLE", sex: "MALE", notes: "Anointed by Samuel; the Spirit of the LORD came upon him." },

    // --- PENDING (KJV, exact reference, positive presentation) ---
    { canonicalName: "Abraham", nameId: "name-abraham", sourceBook: "Genesis", sourceReference: "Genesis 15:6", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Believed the LORD, and it was counted to him for righteousness." },
    { canonicalName: "Sarah", nameId: "name-sarah", sourceBook: "Hebrews", sourceReference: "Hebrews 11:11", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Through faith received strength to conceive, judging him faithful who had promised." },
    { canonicalName: "Isaac", nameId: "name-isaac", sourceBook: "Genesis", sourceReference: "Genesis 25:21", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Entreated the LORD for his wife Rebekah." },
    { canonicalName: "Rebekah", nameId: "name-rebekah", sourceBook: "Genesis", sourceReference: "Genesis 24:58", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Willingly agreed to go with Abraham's servant: I will go." },
    { canonicalName: "Rachel", nameId: "name-rachel", sourceBook: "Genesis", sourceReference: "Genesis 29:18", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Beloved wife of Jacob, for whom he served seven years." },
    { canonicalName: "Leah", nameId: "name-leah", sourceBook: "Genesis", sourceReference: "Genesis 29:31", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "The LORD saw that she was hated, and opened her womb." },
    { canonicalName: "Joseph", nameId: "name-joseph", sourceBook: "Genesis", sourceReference: "Genesis 39:2", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "The LORD was with Joseph in Potiphar's house. Note: shares a name with tribe principal JOSEPH; the owner has separately approved this name for the pool." },
    { canonicalName: "Reuben", nameId: "name-reuben", sourceBook: "Genesis", sourceReference: "Genesis 37:22", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Sought to deliver Joseph out of his brothers' hands." },
    { canonicalName: "Judah", nameId: "name-judah", sourceBook: "Genesis", sourceReference: "Genesis 44:33", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Offered himself as bondman in Benjamin's place. Note: shares a name with tribe principal JUDAH; owner to rule whether worker names may repeat a principal name." },
    { canonicalName: "Benjamin", nameId: "name-benjamin", sourceBook: "Genesis", sourceReference: "Genesis 45:14", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Beloved younger brother; Joseph fell upon his neck and wept. Note: shares a name with tribe principal BENJAMIN; owner to rule whether worker names may repeat a principal name." },
    { canonicalName: "Enoch", nameId: "name-enoch", sourceBook: "Genesis", sourceReference: "Genesis 5:24", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Walked with God, and was not, for God took him." },
    { canonicalName: "Noah", nameId: "name-noah", sourceBook: "Genesis", sourceReference: "Genesis 6:9", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A just man, perfect in his generations; Noah walked with God." },
    { canonicalName: "Abel", nameId: "name-abel", sourceBook: "Hebrews", sourceReference: "Hebrews 11:4", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "By faith offered a more excellent sacrifice and obtained witness that he was righteous." },
    { canonicalName: "Melchizedek", nameId: "name-melchizedek", sourceBook: "Genesis", sourceReference: "Genesis 14:18", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Priest of the most high God who blessed Abram." },
    { canonicalName: "Eliezer of Damascus", nameId: "name-eliezer-of-damascus", sourceBook: "Genesis", sourceReference: "Genesis 24:12", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Abraham's faithful steward who prayed for guidance in finding Isaac a wife." },
    { canonicalName: "Moses", nameId: "name-moses", sourceBook: "Numbers", sourceReference: "Numbers 12:3", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Very meek above all the men which were upon the face of the earth." },
    { canonicalName: "Aaron", nameId: "name-aaron", sourceBook: "Exodus", sourceReference: "Exodus 28:1", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Chosen by God to minister in the priest's office." },
    { canonicalName: "Miriam", nameId: "name-miriam", sourceBook: "Exodus", sourceReference: "Exodus 15:20", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Prophetess who led the women in praise after the Red Sea." },
    { canonicalName: "Jethro", nameId: "name-jethro", sourceBook: "Exodus", sourceReference: "Exodus 18:12", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Took burnt offerings and sacrifices for God and blessed the LORD." },
    { canonicalName: "Bezalel", nameId: "name-bezalel", sourceBook: "Exodus", sourceReference: "Exodus 31:2", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Called by name and filled with the spirit of God in wisdom and workmanship." },
    { canonicalName: "Joshua", nameId: "name-joshua", sourceBook: "Numbers", sourceReference: "Numbers 14:6", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "With Caleb, rent his clothes and urged Israel to trust the LORD." },
    { canonicalName: "Caleb", nameId: "name-caleb", sourceBook: "Numbers", sourceReference: "Numbers 14:24", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Had another spirit within him and followed the LORD fully." },
    { canonicalName: "Rahab", nameId: "name-rahab", sourceBook: "Hebrews", sourceReference: "Hebrews 11:31", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "By faith received the spies with peace." },
    { canonicalName: "Gideon", nameId: "name-gideon", sourceBook: "Judges", sourceReference: "Judges 6:12", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Addressed by the angel as a mighty man of valour." },
    { canonicalName: "Deborah", nameId: "name-deborah", sourceBook: "Judges", sourceReference: "Judges 4:4", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Prophetess who judged Israel at that time." },
    { canonicalName: "Ruth", nameId: "name-ruth", sourceBook: "Ruth", sourceReference: "Ruth 1:16", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Whither thou goest, I will go; thy people shall be my people, and thy God my God." },
    { canonicalName: "Boaz", nameId: "name-boaz", sourceBook: "Ruth", sourceReference: "Ruth 2:4", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Blessed his reapers in the name of the LORD." },
    { canonicalName: "Hannah", nameId: "name-hannah", sourceBook: "1 Samuel", sourceReference: "1 Samuel 1:10", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "In bitterness of soul, prayed unto the LORD and wept sore." },
    { canonicalName: "Samuel", nameId: "name-samuel", sourceBook: "1 Samuel", sourceReference: "1 Samuel 3:19", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "The LORD was with him, and did let none of his words fall to the ground." },
    { canonicalName: "Jonathan", nameId: "name-jonathan", sourceBook: "1 Samuel", sourceReference: "1 Samuel 18:1", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "His soul was knit with the soul of David; he loved him as his own soul." },
    { canonicalName: "Abigail", nameId: "name-abigail", sourceBook: "1 Samuel", sourceReference: "1 Samuel 25:32", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Her wise counsel was blessed by David as sent from God." },
    { canonicalName: "Nathan", nameId: "name-nathan", sourceBook: "2 Samuel", sourceReference: "2 Samuel 12:7", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Faithfully confronted David: Thou art the man." },
    { canonicalName: "Zadok", nameId: "name-zadok", sourceBook: "2 Samuel", sourceReference: "2 Samuel 15:24", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Bore the ark of the covenant with David in his flight from Absalom." },
    { canonicalName: "Benaiah", nameId: "name-benaiah", sourceBook: "2 Samuel", sourceReference: "2 Samuel 23:20", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Valiant man who had done many acts." },
    { canonicalName: "Queen of Sheba", nameId: "name-queen-of-sheba", sourceBook: "1 Kings", sourceReference: "1 Kings 10:9", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Blessed the LORD for setting Solomon on the throne of Israel." },
    { canonicalName: "Elijah", nameId: "name-elijah", sourceBook: "1 Kings", sourceReference: "1 Kings 18:36", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Prayed at Carmel that all might know the LORD is God in Israel." },
    { canonicalName: "Elisha", nameId: "name-elisha", sourceBook: "2 Kings", sourceReference: "2 Kings 4:9", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Perceived by the Shunammite woman as a holy man of God." },
    { canonicalName: "Hezekiah", nameId: "name-hezekiah", sourceBook: "2 Kings", sourceReference: "2 Kings 18:3", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Did that which was right in the sight of the LORD." },
    { canonicalName: "Josiah", nameId: "name-josiah", sourceBook: "2 Kings", sourceReference: "2 Kings 22:2", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Did that which was right and walked in all the way of David his father." },
    { canonicalName: "Huldah", nameId: "name-huldah", sourceBook: "2 Kings", sourceReference: "2 Kings 22:14", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Prophetess consulted by the king's men over the found book of the law." },
    { canonicalName: "Asa", nameId: "name-asa", sourceBook: "1 Kings", sourceReference: "1 Kings 15:11", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Did that which was right in the eyes of the LORD, as did David his father." },
    { canonicalName: "Jehoshaphat", nameId: "name-jehoshaphat", sourceBook: "1 Kings", sourceReference: "1 Kings 22:43", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Walked in all the ways of Asa his father, doing that which was right in the eyes of the LORD." },
    { canonicalName: "Isaiah", nameId: "name-isaiah", sourceBook: "Isaiah", sourceReference: "Isaiah 6:8", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Answered the LORD's call: Here am I; send me." },
    { canonicalName: "Jeremiah", nameId: "name-jeremiah", sourceBook: "Jeremiah", sourceReference: "Jeremiah 1:5", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Sanctified and ordained a prophet unto the nations before birth." },
    { canonicalName: "Ezekiel", nameId: "name-ezekiel", sourceBook: "Ezekiel", sourceReference: "Ezekiel 3:17", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Made a watchman unto the house of Israel." },
    { canonicalName: "Micah", nameId: "name-micah", sourceBook: "Micah", sourceReference: "Micah 6:8", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Spoke the LORD's requirement: do justly, and love mercy, and walk humbly with thy God." },
    { canonicalName: "Zerubbabel", nameId: "name-zerubbabel", sourceBook: "Haggai", sourceReference: "Haggai 2:23", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Chosen by the LORD as a signet." },
    { canonicalName: "Daniel", nameId: "name-daniel", sourceBook: "Daniel", sourceReference: "Daniel 1:8", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Purposed in his heart that he would not defile himself with the portion of the king's meat." },
    { canonicalName: "Shadrach", nameId: "name-shadrach", sourceBook: "Daniel", sourceReference: "Daniel 3:16", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "With Meshach and Abednego, refused to answer the king with compromise." },
    { canonicalName: "Meshach", nameId: "name-meshach", sourceBook: "Daniel", sourceReference: "Daniel 3:16", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "With Shadrach and Abednego, refused to answer the king with compromise." },
    { canonicalName: "Abednego", nameId: "name-abednego", sourceBook: "Daniel", sourceReference: "Daniel 3:16", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "With Shadrach and Meshach, refused to answer the king with compromise." },
    { canonicalName: "Esther", nameId: "name-esther", sourceBook: "Esther", sourceReference: "Esther 4:16", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "If I perish, I perish: risked her life for her people." },
    { canonicalName: "Mordecai", nameId: "name-mordecai", sourceBook: "Esther", sourceReference: "Esther 2:7", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Brought up Hadassah, that is, Esther, his uncle's daughter." },
    { canonicalName: "Ezra", nameId: "name-ezra", sourceBook: "Ezra", sourceReference: "Ezra 7:10", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Prepared his heart to seek the law of the LORD, and to do it, and to teach it in Israel." },
    { canonicalName: "Nehemiah", nameId: "name-nehemiah", sourceBook: "Nehemiah", sourceReference: "Nehemiah 1:4", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Sat down and wept, and mourned, and fasted, and prayed before the God of heaven for Jerusalem." },
    { canonicalName: "Job", nameId: "name-job", sourceBook: "Job", sourceReference: "Job 1:1", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Perfect and upright, one that feared God and eschewed evil." },
    { canonicalName: "Zechariah", nameId: "name-zechariah", sourceBook: "Luke", sourceReference: "Luke 1:6", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Righteous before God, walking in all the commandments and ordinances of the Lord blameless. The priest, father of John the Baptist; distinct from the prophet Zechariah." },
    { canonicalName: "Elisabeth", nameId: "name-elisabeth", sourceBook: "Luke", sourceReference: "Luke 1:6", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Righteous before God, walking in all the commandments and ordinances of the Lord blameless." },
    { canonicalName: "Mary", nameId: "name-mary", sourceBook: "Luke", sourceReference: "Luke 1:38", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Behold the handmaid of the Lord; be it unto me according to thy word. The mother of Jesus." },
    { canonicalName: "Joseph of Nazareth", nameId: "name-joseph-of-nazareth", sourceBook: "Matthew", sourceReference: "Matthew 1:19", sourceTier: "KJV", duplicateStatus: "VARIANT_OF:Joseph", duplicateState: "VARIANT_OF:Joseph", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A just man; husband of Mary. Same given name as the patriarch Joseph; a different person." },
    { canonicalName: "Simeon", nameId: "name-simeon", sourceBook: "Luke", sourceReference: "Luke 2:25", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Just and devout, waiting for the consolation of Israel." },
    { canonicalName: "John the Baptist", nameId: "name-john-the-baptist", sourceBook: "Matthew", sourceReference: "Matthew 11:11", sourceTier: "KJV", duplicateStatus: "VARIANT_OF:John", duplicateState: "VARIANT_OF:John", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Among them that are born of women there hath not risen a greater. Same given name as the apostle John; a different person." },
    { canonicalName: "Peter", nameId: "name-peter", sourceBook: "Matthew", sourceReference: "Matthew 16:16", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Confessed: Thou art the Christ, the Son of the living God." },
    { canonicalName: "Andrew", nameId: "name-andrew", sourceBook: "John", sourceReference: "John 1:42", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Brought his brother Simon Peter to Jesus." },
    { canonicalName: "John", nameId: "name-john", sourceBook: "John", sourceReference: "John 13:23", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "The disciple whom Jesus loved, leaning on Jesus' bosom at supper." },
    { canonicalName: "James son of Zebedee", nameId: "name-james-son-of-zebedee", sourceBook: "Matthew", sourceReference: "Matthew 4:22", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Immediately left the ship and his father, and followed Jesus." },
    { canonicalName: "Philip", nameId: "name-philip", sourceBook: "John", sourceReference: "John 1:43", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Called by Jesus: Follow me." },
    { canonicalName: "Thomas", nameId: "name-thomas", sourceBook: "John", sourceReference: "John 20:28", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Confessed the risen Christ: My Lord and my God." },
    { canonicalName: "Matthew", nameId: "name-matthew", sourceBook: "Matthew", sourceReference: "Matthew 9:9", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Arose and followed Jesus at his call." },
    { canonicalName: "Martha", nameId: "name-martha", sourceBook: "John", sourceReference: "John 11:27", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Confessed: I believe that thou art the Christ, the Son of God, which should come into the world." },
    { canonicalName: "Mary of Bethany", nameId: "name-mary-of-bethany", sourceBook: "John", sourceReference: "John 12:3", sourceTier: "KJV", duplicateStatus: "VARIANT_OF:Mary", duplicateState: "VARIANT_OF:Mary", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Anointed the feet of Jesus with costly ointment. Same given name as Mary the mother of Jesus; a different person." },
    { canonicalName: "Mary Magdalene", nameId: "name-mary-magdalene", sourceBook: "Luke", sourceReference: "Luke 8:2", sourceTier: "KJV", duplicateStatus: "VARIANT_OF:Mary", duplicateState: "VARIANT_OF:Mary", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Mary called Magdalene, out of whom went seven devils; she followed and ministered unto him (Luke 8:2-3). Same given name as Mary the mother of Jesus; a different person." },
    { canonicalName: "Lazarus", nameId: "name-lazarus", sourceBook: "John", sourceReference: "John 11:3", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "He whom thou lovest is sick: the friend Jesus loved and raised." },
    { canonicalName: "Nicodemus", nameId: "name-nicodemus", sourceBook: "John", sourceReference: "John 19:39", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Brought a mixture of myrrh and aloes to honour the body of Jesus." },
    { canonicalName: "Zacchaeus", nameId: "name-zacchaeus", sourceBook: "Luke", sourceReference: "Luke 19:8", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Gave half his goods to the poor and restored fourfold what he had taken." },
    { canonicalName: "Joseph of Arimathaea", nameId: "name-joseph-of-arimathaea", sourceBook: "Matthew", sourceReference: "Matthew 27:57", sourceTier: "KJV", duplicateStatus: "VARIANT_OF:Joseph", duplicateState: "VARIANT_OF:Joseph", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A disciple of Jesus who claimed his body for burial. Same given name as the patriarch Joseph; a different person." },
    { canonicalName: "Paul", nameId: "name-paul", sourceBook: "Acts", sourceReference: "Acts 9:15", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A chosen vessel unto the LORD to bear his name before the Gentiles." },
    { canonicalName: "Barnabas", nameId: "name-barnabas", sourceBook: "Acts", sourceReference: "Acts 11:24", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A good man, and full of the Holy Ghost and of faith." },
    { canonicalName: "Stephen", nameId: "name-stephen", sourceBook: "Acts", sourceReference: "Acts 6:5", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A man full of faith and of the Holy Ghost." },
    { canonicalName: "Cornelius", nameId: "name-cornelius", sourceBook: "Acts", sourceReference: "Acts 10:2", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A devout man that feared God with all his house, which gave much alms and prayed to God alway." },
    { canonicalName: "Tabitha", nameId: "name-tabitha", sourceBook: "Acts", sourceReference: "Acts 9:36", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Full of good works and almsdeeds which she did; also called Dorcas." },
    { canonicalName: "Lydia", nameId: "name-lydia", sourceBook: "Acts", sourceReference: "Acts 16:14", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Her heart the Lord opened, that she attended unto the things which were spoken of Paul." },
    { canonicalName: "Priscilla", nameId: "name-priscilla", sourceBook: "Acts", sourceReference: "Acts 18:26", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "With Aquila, expounded unto Apollos the way of God more perfectly." },
    { canonicalName: "Aquila", nameId: "name-aquila", sourceBook: "Romans", sourceReference: "Romans 16:3", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Greeted by Paul as a helper in Christ Jesus." },
    { canonicalName: "Phoebe", nameId: "name-phoebe", sourceBook: "Romans", sourceReference: "Romans 16:1", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "A servant of the church which is at Cenchrea, commended by Paul." },
    { canonicalName: "Timothy", nameId: "name-timothy", sourceBook: "2 Timothy", sourceReference: "2 Timothy 1:5", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "In whom dwelt unfeigned faith." },
    { canonicalName: "Titus", nameId: "name-titus", sourceBook: "2 Corinthians", sourceReference: "2 Corinthians 8:23", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Paul's partner and fellowhelper concerning the Corinthians." },
    { canonicalName: "Luke", nameId: "name-luke", sourceBook: "Colossians", sourceReference: "Colossians 4:14", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "The beloved physician." },
    { canonicalName: "Mark", nameId: "name-mark", sourceBook: "2 Timothy", sourceReference: "2 Timothy 4:11", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "Profitable to Paul for the ministry; also called John Mark." },
    { canonicalName: "Silas", nameId: "name-silas", sourceBook: "Acts", sourceReference: "Acts 15:22", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "A chief man among the brethren, sent with Paul and Barnabas." },
    { canonicalName: "Apollos", nameId: "name-apollos", sourceBook: "Acts", sourceReference: "Acts 18:24", sourceTier: "KJV", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "PENDING", approvalState: "PENDING", availabilityState: "AVAILABLE", sex: "MALE", notes: "An eloquent man, and mighty in the scriptures." },

    // --- REQUIRES_VERIFICATION (Apocrypha; reference NOT guessed) ---
    { canonicalName: "Tobit", nameId: "name-tobit", sourceBook: "Tobit", sourceReference: null, sourceTier: "APOCRYPHA", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "REQUIRES_VERIFICATION", approvalState: "REQUIRES_VERIFICATION", availabilityState: "AVAILABLE", sex: "MALE", notes: "Apocrypha. Remembered for almsgiving and walking in truth and justice; the exact verse reference is not yet confirmed, so no reference is recorded. Do not guess." },
    { canonicalName: "Judith", nameId: "name-judith", sourceBook: "Judith", sourceReference: null, sourceTier: "APOCRYPHA", duplicateStatus: "UNIQUE", duplicateState: "UNIQUE", DanielApprovalState: "REQUIRES_VERIFICATION", approvalState: "REQUIRES_VERIFICATION", availabilityState: "AVAILABLE", sex: "FEMALE", notes: "Apocrypha. Remembered as a God-fearing widow who delivered Israel; the exact verse reference is not yet confirmed, so no reference is recorded. Do not guess." }
  ];

  function copy(entry) {
    return {
      canonicalName: entry.canonicalName,
      nameId: entry.nameId,
      sourceBook: entry.sourceBook,
      sourceReference: entry.sourceReference,
      sourceTier: entry.sourceTier,
      duplicateStatus: entry.duplicateStatus,
      duplicateState: entry.duplicateState,
      DanielApprovalState: entry.DanielApprovalState,
      approvalState: entry.approvalState,
      availabilityState: entry.availabilityState,
      sex: entry.sex,
      notes: entry.notes
    };
  }

  function all() {
    return ENTRIES.map(copy);
  }

  function listNames() {
    return ENTRIES.map(function (e) { return e.canonicalName; });
  }

  function getName(canonicalName) {
    if (typeof canonicalName !== "string") return null;
    for (var i = 0; i < ENTRIES.length; i++) {
      if (ENTRIES[i].canonicalName === canonicalName) return copy(ENTRIES[i]);
    }
    return null;
  }

  function listByTier(tier) {
    return ENTRIES.filter(function (e) { return e.sourceTier === tier; })
      .map(copy);
  }

  function listByApprovalState(state) {
    return ENTRIES.filter(function (e) { return e.DanielApprovalState === state; })
      .map(copy);
  }

  function listApproved() {
    return listByApprovalState("APPROVED");
  }

  function summary() {
    var byTier = {};
    var bySex = {};
    var approved = 0;
    var pending = 0;
    var requiresVerification = 0;
    SOURCE_TIERS.forEach(function (t) { byTier[t] = 0; });
    SEXES.forEach(function (s) { bySex[s] = 0; });
    ENTRIES.forEach(function (e) {
      if (byTier[e.sourceTier] !== undefined) byTier[e.sourceTier]++;
      if (bySex[e.sex] !== undefined) bySex[e.sex]++;
      if (e.DanielApprovalState === "APPROVED") approved++;
      else if (e.DanielApprovalState === "PENDING") pending++;
      else if (e.DanielApprovalState === "REQUIRES_VERIFICATION") requiresVerification++;
    });
    // Computed, never hand-written: COMPLETE only when the target is
    // genuinely reached AND every entry passes validation.
    var state = (ENTRIES.length >= TARGET && validatePool().length === 0)
      ? "COMPLETE" : "PARTIAL";
    return {
      target: TARGET,
      entries: ENTRIES.length,
      approved: approved,
      pending: pending,
      requiresVerification: requiresVerification,
      byTier: byTier,
      bySex: bySex,
      state: state
    };
  }

  // Returns an error list (strings). Never throws. An empty list means
  // the pool is internally consistent; it does NOT mean the owner has
  // approved the PENDING entries.
  function validatePool() {
    try {
      var errors = [];
      var seen = {};
      var seenNameIds = {};
      var names = {};

      ENTRIES.forEach(function (e, i) {
        var where = "entry[" + i + "]" +
          (e && typeof e.canonicalName === "string" ? " (" + e.canonicalName + ")" : "");
        var required = ["canonicalName", "nameId", "sourceBook",
          "sourceReference", "sourceTier", "duplicateStatus",
          "duplicateState", "DanielApprovalState", "approvalState",
          "availabilityState", "sex", "notes"];
        required.forEach(function (field) {
          if (!e || e[field] === undefined) {
            errors.push(where + ": missing field " + field);
          }
        });
        if (!e) return;
        if (typeof e.canonicalName !== "string" || e.canonicalName === "") {
          errors.push(where + ": canonicalName must be a non-empty string");
          return;
        }
        if (typeof e.sourceBook !== "string" || e.sourceBook === "") {
          errors.push(where + ": sourceBook must be a non-empty string");
        }
        if (typeof e.notes !== "string") {
          errors.push(where + ": notes must be a string");
        }
        if (SOURCE_TIERS.indexOf(e.sourceTier) === -1) {
          errors.push(where + ": sourceTier outside the closed set: " + e.sourceTier);
        }
        if (APPROVAL_STATES.indexOf(e.DanielApprovalState) === -1) {
          errors.push(where + ": DanielApprovalState outside the closed set: " + e.DanielApprovalState);
        }
        // Spec field names: nameId is a stable unique id; approvalState
        // and duplicateState mirror their historical names exactly;
        // availabilityState is in its own closed set.
        if (typeof e.nameId !== "string" || e.nameId === "") {
          errors.push(where + ": nameId must be a non-empty string");
        } else if (e.nameId.indexOf("name-") !== 0) {
          errors.push(where + ": nameId must start with \"name-\": " + e.nameId);
        }
        if (APPROVAL_STATES.indexOf(e.approvalState) === -1) {
          errors.push(where + ": approvalState outside the closed set: " + e.approvalState);
        } else if (e.approvalState !== e.DanielApprovalState) {
          errors.push(where + ": approvalState must mirror DanielApprovalState");
        }
        var dupState = String(e.duplicateState || "");
        if (!/^(UNIQUE|DUPLICATE_OF:(.+)|VARIANT_OF:(.+))$/.test(dupState)) {
          errors.push(where + ": duplicateState outside the closed set: " + e.duplicateState);
        } else if (dupState !== e.duplicateStatus) {
          errors.push(where + ": duplicateState must mirror duplicateStatus");
        }
        if (AVAILABILITY_STATES.indexOf(e.availabilityState) === -1) {
          errors.push(where + ": availabilityState outside the closed set: " + e.availabilityState);
        }
        if (SEXES.indexOf(e.sex) === -1) {
          errors.push(where + ": sex outside the closed set: " + e.sex);
        }
        var dup = String(e.duplicateStatus || "");
        var dupMatch = dup.match(/^(UNIQUE|DUPLICATE_OF:(.+)|VARIANT_OF:(.+))$/);
        if (!dupMatch) {
          errors.push(where + ": duplicateStatus outside the closed set: " + e.duplicateStatus);
        } else if (dupMatch[2] || dupMatch[3]) {
          var target = dupMatch[2] || dupMatch[3];
          if (target === e.canonicalName) {
            errors.push(where + ": duplicateStatus points at itself: " + dup);
          }
        }
        if (e.DanielApprovalState === "APPROVED" &&
            APPROVED_NAMES.indexOf(e.canonicalName) === -1) {
          errors.push(where + ": APPROVED but not one of the owner-approved names (Solomon, Jacob, David)");
        }
        if (e.sourceReference === null) {
          if (e.DanielApprovalState !== "REQUIRES_VERIFICATION") {
            errors.push(where + ": sourceReference is null but DanielApprovalState is not REQUIRES_VERIFICATION");
          }
        } else if (typeof e.sourceReference !== "string" ||
                   !REFERENCE_PATTERN.test(e.sourceReference)) {
          errors.push(where + ": sourceReference is not in \"Book chapter:verse\" form: " + e.sourceReference);
        } else if (typeof e.sourceBook === "string" &&
                   e.sourceReference.indexOf(e.sourceBook + " ") !== 0) {
          errors.push(where + ": sourceReference does not begin with sourceBook: " + e.sourceReference);
        }
        // Duplicate canonicalName without a duplicateStatus flag.
        if (seen[e.canonicalName] !== undefined) {
          if (dup === "UNIQUE") {
            errors.push(where + ": duplicate canonicalName without duplicateStatus (first seen at entry[" + seen[e.canonicalName] + "])");
          }
        } else {
          seen[e.canonicalName] = i;
        }
        // nameId is a stable id: two entries must never share one.
        if (typeof e.nameId === "string" && e.nameId !== "") {
          if (seenNameIds[e.nameId] !== undefined) {
            errors.push(where + ": duplicate nameId " + e.nameId + " (first seen at entry[" + seenNameIds[e.nameId] + "])");
          } else {
            seenNameIds[e.nameId] = i;
          }
        }
        names[e.canonicalName] = true;
      });

      // DUPLICATE_OF / VARIANT_OF targets must exist in the pool.
      // Checked for both duplicateStatus and its mirror duplicateState.
      ENTRIES.forEach(function (e, i) {
        if (!e || typeof e.duplicateStatus !== "string") return;
        var m = e.duplicateStatus.match(/^(?:DUPLICATE_OF|VARIANT_OF):(.+)$/);
        if (m && !names[m[1]]) {
          errors.push("entry[" + i + "] (" + e.canonicalName + "): duplicateStatus target not in pool: " + m[1]);
        }
        if (typeof e.duplicateState === "string") {
          var m2 = e.duplicateState.match(/^(?:DUPLICATE_OF|VARIANT_OF):(.+)$/);
          if (m2 && !names[m2[1]]) {
            errors.push("entry[" + i + "] (" + e.canonicalName + "): duplicateState target not in pool: " + m2[1]);
          }
        }
      });

      return errors;
    } catch (err) {
      return ["validatePool failed: " + (err && err.message ? err.message : String(err))];
    }
  }

  global.BotNamingPool = {
    TARGET: TARGET,
    SOURCE_TIERS: SOURCE_TIERS.slice(),
    APPROVAL_STATES: APPROVAL_STATES.slice(),
    AVAILABILITY_STATES: AVAILABILITY_STATES.slice(),
    APPROVED_NAMES: APPROVED_NAMES.slice(),
    all: all,
    listNames: listNames,
    getName: getName,
    listByTier: listByTier,
    listByApprovalState: listByApprovalState,
    listApproved: listApproved,
    summary: summary,
    validatePool: validatePool,
    truthStateFor: truthStateFor
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
