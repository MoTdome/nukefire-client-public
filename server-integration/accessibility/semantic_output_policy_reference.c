/* Dependency-light semantic OUTPUT/SPEECH model derived from NukeFire Beta.73. */
#include "semantic_output_policy_reference.h"
#include <stddef.h>
#include <string.h>

struct category_def { const char *name; int parent; };
static const struct category_def defs[NF_CAT_COUNT] = {
    {"combat.self", NF_CAT_COMBAT},
    {"combat.others", NF_CAT_COMBAT},
    {"combat.flavor", NF_CAT_COMBAT},
    {"regen", -1},
    {"movement.others", NF_CAT_MOVEMENT},
    {"combat", -1},
    {"movement", -1},
    {"movement.group", NF_CAT_MOVEMENT},
    {"combat.self.miss", NF_CAT_COMBAT_SELF},
    {"combat.others.miss", NF_CAT_COMBAT_OTHERS},
    {"combat.proc", NF_CAT_COMBAT},
    {"loot", -1},
    {"affect", -1},
    {"affect.fade", NF_CAT_AFFECT},
    {"affect.others", NF_CAT_AFFECT},
    {"combat.group", NF_CAT_COMBAT},
    {"prompt.mobcount", -1},
    {"communication", -1},
    {"communication.gossip", NF_CAT_COMMUNICATION},
    {"communication.ssf", NF_CAT_COMMUNICATION},
    {"communication.skynet", NF_CAT_COMMUNICATION},
    {"crafting", -1}
};

static int valid_category(int category) { return category >= 0 && category < NF_CAT_COUNT; }
static int valid_output_mode(int mode) { return mode >= NF_OUTPUT_FULL && mode <= NF_OUTPUT_OFF; }
static int valid_speech_mode(int mode) { return mode == NF_SPEECH_ON || mode == NF_SPEECH_OFF; }

const char *nf_category_name(int category) { return valid_category(category) ? defs[category].name : "unknown"; }
int nf_category_parent(int category) { return valid_category(category) ? defs[category].parent : -1; }

void nf_policy_reset(struct nf_policy_state *state) {
    if (!state) return;
    memset(state, 0, sizeof(*state));
}

void nf_output_set(struct nf_policy_state *state, int category, int mode) {
    if (!state || !valid_category(category) || !valid_output_mode(mode)) return;
    state->output_mode[category] = (uint8_t)mode;
    state->output_set_mask |= (1U << category);
}

void nf_output_clear(struct nf_policy_state *state, int category) {
    if (!state || !valid_category(category)) return;
    state->output_set_mask &= ~(1U << category);
    state->output_mode[category] = NF_OUTPUT_FULL;
}

int nf_output_override(const struct nf_policy_state *state, int category) {
    int guard = 0;
    if (!state) return -1;
    while (valid_category(category) && guard++ < 16) {
        if (state->output_set_mask & (1U << category)) return state->output_mode[category];
        category = defs[category].parent;
    }
    return -1;
}

void nf_speech_set(struct nf_policy_state *state, int category, int mode) {
    if (!state || !valid_category(category) || !valid_speech_mode(mode)) return;
    state->speech_mode[category] = (uint8_t)mode;
    state->speech_set_mask |= (1U << category);
}

void nf_speech_clear(struct nf_policy_state *state, int category) {
    if (!state || !valid_category(category)) return;
    state->speech_set_mask &= ~(1U << category);
    state->speech_mode[category] = NF_SPEECH_ON;
}

int nf_speech_override(const struct nf_policy_state *state, int category) {
    int guard = 0;
    if (!state) return -1;
    while (valid_category(category) && guard++ < 16) {
        if (state->speech_set_mask & (1U << category)) return state->speech_mode[category];
        category = defs[category].parent;
    }
    return -1;
}

int nf_resolve_category(int event, int relation) {
    switch (event) {
    case NF_EVENT_COMBAT_DETAIL:
    case NF_EVENT_COMBAT_SUMMARY:
        return relation == NF_RELATION_SELF ? NF_CAT_COMBAT_SELF : NF_CAT_COMBAT_OTHERS;
    case NF_EVENT_COMBAT_MISS:
        return relation == NF_RELATION_SELF ? NF_CAT_COMBAT_SELF_MISS : NF_CAT_COMBAT_OTHERS_MISS;
    case NF_EVENT_COMBAT_FLAVOR: return NF_CAT_COMBAT_FLAVOR;
    case NF_EVENT_COMBAT_PROC_DETAIL:
    case NF_EVENT_COMBAT_PROC_SUMMARY: return NF_CAT_COMBAT_PROC;
    case NF_EVENT_REGEN: return NF_CAT_REGEN;
    case NF_EVENT_MOVEMENT_GROUP:
        return relation == NF_RELATION_GROUP ? NF_CAT_MOVEMENT_GROUP : NF_CAT_MOVEMENT_OTHERS;
    case NF_EVENT_MOVEMENT_OTHERS: return NF_CAT_MOVEMENT_OTHERS;
    case NF_EVENT_LOOT: return NF_CAT_LOOT;
    case NF_EVENT_AFFECT_FADE:
        return relation == NF_RELATION_SELF ? NF_CAT_AFFECT_FADE : NF_CAT_AFFECT_OTHERS;
    case NF_EVENT_COMBAT_GROUP_SUMMARY: return NF_CAT_COMBAT_GROUP;
    case NF_EVENT_COMMUNICATION_GOSSIP: return NF_CAT_COMMUNICATION_GOSSIP;
    case NF_EVENT_COMMUNICATION_SSF: return NF_CAT_COMMUNICATION_SSF;
    case NF_EVENT_COMMUNICATION_SKYNET: return NF_CAT_COMMUNICATION_SKYNET;
    case NF_EVENT_CRAFTING: return NF_CAT_CRAFTING;
    default: return -1;
    }
}

int nf_output_should_suppress(const struct nf_policy_state *state, int event, int relation, unsigned flags) {
    int category, mode;
    if (flags & NF_OUTCTX_PROTECTED) return 0;
    category = nf_resolve_category(event, relation);
    if (!valid_category(category)) return 0;
    mode = nf_output_override(state, category);
    if (mode < 0 || mode == NF_OUTPUT_FULL) return 0;
    if (mode == NF_OUTPUT_OFF) return 1;
    if (category == NF_CAT_COMBAT_FLAVOR && event == NF_EVENT_COMBAT_FLAVOR) return 1;
    if (category == NF_CAT_COMBAT_PROC && event == NF_EVENT_COMBAT_PROC_DETAIL) return 1;
    if (category == NF_CAT_COMBAT_OTHERS && event == NF_EVENT_COMBAT_DETAIL) return 1;
    return 0;
}

int nf_speech_should_suppress(const struct nf_policy_state *state, int event, int relation, unsigned flags) {
    int category, mode;
    if (flags & NF_OUTCTX_PROTECTED) return 0;
    category = nf_resolve_category(event, relation);
    if (!valid_category(category)) return 0;
    mode = nf_speech_override(state, category);
    return mode == NF_SPEECH_OFF;
}
