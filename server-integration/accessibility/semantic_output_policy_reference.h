#ifndef NF_SEMANTIC_OUTPUT_POLICY_REFERENCE_H
#define NF_SEMANTIC_OUTPUT_POLICY_REFERENCE_H

#include <stdint.h>

#define NF_OUTCTX_PROTECTED (1U << 0)

enum nf_category {
    NF_CAT_COMBAT_SELF = 0,
    NF_CAT_COMBAT_OTHERS,
    NF_CAT_COMBAT_FLAVOR,
    NF_CAT_REGEN,
    NF_CAT_MOVEMENT_OTHERS,
    NF_CAT_COMBAT,
    NF_CAT_MOVEMENT,
    NF_CAT_MOVEMENT_GROUP,
    NF_CAT_COMBAT_SELF_MISS,
    NF_CAT_COMBAT_OTHERS_MISS,
    NF_CAT_COMBAT_PROC,
    NF_CAT_LOOT,
    NF_CAT_AFFECT,
    NF_CAT_AFFECT_FADE,
    NF_CAT_AFFECT_OTHERS,
    NF_CAT_COMBAT_GROUP,
    NF_CAT_PROMPT_MOBCOUNT,
    NF_CAT_COMMUNICATION,
    NF_CAT_COMMUNICATION_GOSSIP,
    NF_CAT_COMMUNICATION_SSF,
    NF_CAT_COMMUNICATION_SKYNET,
    NF_CAT_CRAFTING,
    NF_CAT_COUNT
};

enum nf_output_mode { NF_OUTPUT_FULL = 0, NF_OUTPUT_SUMMARY = 1, NF_OUTPUT_OFF = 2 };
enum nf_speech_mode { NF_SPEECH_ON = 0, NF_SPEECH_OFF = 1 };
enum nf_relation { NF_RELATION_OTHER = 0, NF_RELATION_SELF = 1, NF_RELATION_GROUP = 2 };

enum nf_event {
    NF_EVENT_NONE = 0,
    NF_EVENT_COMBAT_DETAIL,
    NF_EVENT_COMBAT_SUMMARY,
    NF_EVENT_COMBAT_FLAVOR,
    NF_EVENT_REGEN,
    NF_EVENT_MOVEMENT_OTHERS,
    NF_EVENT_MOVEMENT_GROUP,
    NF_EVENT_COMBAT_MISS,
    NF_EVENT_COMBAT_PROC_DETAIL,
    NF_EVENT_COMBAT_PROC_SUMMARY,
    NF_EVENT_LOOT,
    NF_EVENT_AFFECT_FADE,
    NF_EVENT_COMBAT_GROUP_SUMMARY,
    NF_EVENT_COMMUNICATION_GOSSIP,
    NF_EVENT_COMMUNICATION_SSF,
    NF_EVENT_COMMUNICATION_SKYNET,
    NF_EVENT_CRAFTING
};

struct nf_policy_state {
    uint32_t output_set_mask;
    uint8_t output_mode[NF_CAT_COUNT];
    uint32_t speech_set_mask;
    uint8_t speech_mode[NF_CAT_COUNT];
};

const char *nf_category_name(int category);
int nf_category_parent(int category);
void nf_policy_reset(struct nf_policy_state *state);
void nf_output_set(struct nf_policy_state *state, int category, int mode);
void nf_output_clear(struct nf_policy_state *state, int category);
int nf_output_override(const struct nf_policy_state *state, int category);
void nf_speech_set(struct nf_policy_state *state, int category, int mode);
void nf_speech_clear(struct nf_policy_state *state, int category);
int nf_speech_override(const struct nf_policy_state *state, int category);
int nf_resolve_category(int event, int relation);
int nf_output_should_suppress(const struct nf_policy_state *state, int event, int relation, unsigned flags);
int nf_speech_should_suppress(const struct nf_policy_state *state, int event, int relation, unsigned flags);

#endif
