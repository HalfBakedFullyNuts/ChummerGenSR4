/**
 * Stores module exports.
 * Re-exports all Svelte stores from a single entry point.
 */

export { user, isSignedIn, type AppUser } from './user';

export {
    gameData,
    gameDataLoading,
    metatypes,
    skills,
    qualities,
    positiveQualities,
    negativeQualities,
    spells,
    powers,
    traditions,
    mentors,
    programs,
    programCategories,
    weapons,
    armor,
    cyberware,
    gear,
    lifestyles,
    /* Bioware */
    bioware,
    biowareCategories,
    /* Vehicles & Drones */
    vehicles,
    vehicleCategories,
    drones,
    /* Martial Arts */
    martialArts,
    /* Technomancer */
    echoes,
    streams,
    loadGameData,
    findMetatype,
    findSkill,
    findQuality,
    findWeapon,
    findArmor,
    findCyberware,
    findGear,
    findBioware,
    findVehicle,
    findMartialArt,
    findEcho,
    findStream,
    filterSkillsByCategory,
    filterSkillsByGroup,
    filterWeaponsByCategory,
    filterArmorByCategory,
    filterCyberwareByCategory,
    filterGearByCategory,
    filterBiowareByCategory,
    filterVehiclesByCategory,
    type GameData,
    type GameQuality,
    type GameSpell,
    type GamePower,
    type GameTradition,
    type GameMentor,
    type GameLifestyle,
    type GameProgram,
    type GameBioware,
    type GameVehicle,
    type GameMartialArt,
    type GameEcho,
    type GameStream,
    type SkillCategoryDef
} from './gamedata';

export {
    character,
    currentStep,
    currentStepIndex,
    remainingBP,
    bpBreakdown,
    hasMetatype,
    hasNativeLanguage,
    magicType,
    remainingNuyen,
    startingNuyen,
    currentEssence,
    isDirty,
    attributeValidation,
    KARMA_BUILD_COSTS,
    WIZARD_STEPS,
    visibleWizardSteps,
    updateIdentity,
    addQuality,
    addQualityAgain,
    removeQuality,
    type WizardStep,
    type WizardStepConfig,
    type AttributeValueKey,
    AWAKENED_ATTR_KEYS,
    type MagicType,
    type CharacterSummary,
    type AddQualityOptions
} from './character';

export {
    startNewCharacter,
    setBuildMethod,
    setWizardStep,
    nextWizardStep,
    prevWizardStep,
    setMetatype,
    setCustomBuildPoints
} from './creation';

export {
    setAttribute,
    calculateTotalAttributeCost,
    calculateNonSpecialAttributeBP,
    isAttributeNA,
    countMaxedAttributes,
    getMaxedAttributeName
} from './attributes';

export {
    setSkill,
    removeSkill,
    setSkillGroup,
    incrementSkillGroup,
    decrementSkillGroup,
    breakSkillGroup,
    setSkillSpecialization,
    removeSkillSpecialization,
    setSkillWithGroupCheck
} from './skills';

export {
    addKnowledgeSkill,
    removeKnowledgeSkill,
    setKnowledgeSkillRating,
    setKnowledgeSkillCategory,
    setKnowledgeSkillSpecialization,
    incrementKnowledgeSkill,
    decrementKnowledgeSkill,
    calculateFreeKnowledgePoints,
    calculateKnowledgePointsSpent,
    calculateKnowledgeSkillBPCost,
    calculateKnowledgeSkillKarmaCost
} from './knowledgeSkills';

export {
    initializeMagic,
    setTradition,
    setMentor,
    addSpell,
    removeSpell,
    addPower,
    removePower,
    getMagicType,
    addSpirit,
    removeSpirit,
    useSpiritService,
    updateSpiritServices,
    learnMetamagic,
    removeMetamagic
} from './magic';

export {
    initializeResonance,
    addComplexForm,
    removeComplexForm,
    learnEcho,
    removeEcho,
    addSprite,
    removeSprite,
    useSpriteTask,
    registerSprite,
    updateSpriteTasks
} from './technomancer';

export {
    addContact,
    removeContact
} from './contacts';

export {
    updateCondition,
    updateEdge,
    spendAmmo,
    reloadWeapon,
    setAmmo
} from './combat';

export {
    KARMA_COSTS,
    isCareerMode,
    enterCareerMode,
    awardKarma,
    awardNuyen,
    spendNuyen,
    getAttributeImprovementCost,
    improveAttribute,
    getSkillImprovementCost,
    improveSkill,
    learnNewSkill,
    addSpecialization,
    learnKnowledgeSkill,
    improveKnowledgeSkill,
    getExpenseLog,
    initiate,
    getInitiationCost,
    learnSpell,
    learnComplexForm,
    getSubmersionCost,
    submerge
} from './career';

export {
    addWeapon,
    removeWeapon,
    addArmor,
    removeArmor,
    addCyberware,
    addChildCyberware,
    removeChildCyberware,
    removeCyberware,
    addBioware,
    removeBioware,
    addGear,
    addGearToGear,
    removeGearFromGear,
    removeGear,
    moveGearToContainer,
    addVehicle,
    addWeaponToVehicle,
    removeWeaponFromVehicle,
    removeVehicle,
    addMartialArt,
    removeMartialArt,
    addMartialArtTechnique,
    removeMartialArtTechnique,
    MARTIAL_ARTS_COSTS,
    setLifestyle,
    removeLifestyle
} from './equipment';

export {
    saveCurrentCharacter,
    loadSavedCharacter,
    loadImportedCharacter,
    startManualCharacter,
    deleteSavedCharacter,
    listCharacters,
    duplicateCurrentCharacter,
    clearCurrentCharacter,
    markAsSaved,
    hasUnsavedChanges,
    enableAutoSave,
    disableAutoSave
} from './persistence';
