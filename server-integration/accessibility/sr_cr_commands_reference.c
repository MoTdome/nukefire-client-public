/*
 * SR / CR command architecture — sanitized TBA/Circle-style reference
 *
 * This file is deliberately small.  It preserves the useful split in NukeFire:
 *   SR = server-owned accessible presentation
 *   CR = cooperating-client Reader controls over a strict GMCP action bridge
 *
 * Adapt flag storage, command macros, resource getters, and output functions to
 * your codebase.  Do not copy unrelated NukeFire act.informative.c wholesale.
 */

#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include "nukefire_controls_reference.h"

/* Replace these declarations/macros with your MUD's normal API. */
struct char_data;
extern void send_to_char(struct char_data *ch, const char *fmt, ...);
extern bool is_npc(struct char_data *ch);
extern const char *one_argument(const char *input, char *first);
extern bool is_abbrev(const char *arg, const char *word);
extern bool same_word(const char *a, const char *b);

extern bool player_reader_enabled(struct char_data *ch);
extern void set_player_reader_enabled(struct char_data *ch, bool enabled);
extern void set_player_compact_combat(struct char_data *ch, bool enabled);
extern void set_player_brief_rooms(struct char_data *ch, bool enabled);
extern void set_player_compact_prompt(struct char_data *ch, bool enabled);
extern void clear_visual_prompt_components(struct char_data *ch);

extern long long current_hit(struct char_data *ch);
extern long long maximum_hit(struct char_data *ch);
extern long long current_mana(struct char_data *ch);
extern long long maximum_mana(struct char_data *ch);
extern long long current_move(struct char_data *ch);
extern long long maximum_move(struct char_data *ch);

extern void send_reader_room(struct char_data *ch);
extern void send_reader_exits(struct char_data *ch);
extern void send_reader_target(struct char_data *ch);
extern void send_reader_group(struct char_data *ch);
extern void send_reader_gear(struct char_data *ch);
extern void send_reader_inventory(struct char_data *ch);
extern void send_reader_affects(struct char_data *ch);
extern void send_reader_danger(struct char_data *ch);

static int percent(long long current, long long maximum)
{
    if (maximum <= 0)
        maximum = 1;
    if (current < 0)
        current = 0;
    if (current > maximum)
        current = maximum;
    return (int)((current * 100LL) / maximum);
}

static void send_resource(struct char_data *ch,
                          const char *label,
                          long long current,
                          long long maximum)
{
    if (maximum <= 0)
        maximum = 1;

    send_to_char(ch, "%s: %lld of %lld, %d percent.\r\n",
                 label, current, maximum, percent(current, maximum));
}

static void sr_apply_setup_profile(struct char_data *ch, const char *profile)
{
    bool descriptive = false;
    bool minimal = false;

    if (!profile || !*profile)
        profile = "balanced";

    if (is_abbrev(profile, "descriptive") || is_abbrev(profile, "verbose"))
        descriptive = true;
    else if (is_abbrev(profile, "minimal"))
        minimal = true;
    else if (!is_abbrev(profile, "balanced") &&
             !is_abbrev(profile, "default")) {
        send_to_char(ch,
            "Use SR SETUP DESCRIPTIVE, BALANCED, or MINIMAL.\r\n");
        return;
    }

    set_player_reader_enabled(ch, true);
    set_player_compact_prompt(ch, true);
    set_player_compact_combat(ch, true);
    set_player_brief_rooms(ch, !descriptive);
    clear_visual_prompt_components(ch);

    /*
     * NukeFire additionally enables its semantic summary/output suite here.
     * A smaller port can start with the flags above and add output policy later.
     * MINIMAL can also enable a reversible quiet-communications preset.
     */

    send_to_char(ch, "Screen reader %s profile is active.\r\n",
                 descriptive ? "descriptive" : minimal ? "minimal" : "balanced");
    send_to_char(ch,
        "Visual prompt repetition is reduced; use SR HP, MANA, and MOVE for exact values.\r\n");
}

static void sr_help(struct char_data *ch)
{
    send_to_char(ch,
        "Screen reader commands:\r\n"
        "  SR ON / OFF\r\n"
        "  SR SETUP DESCRIPTIVE|BALANCED|MINIMAL\r\n"
        "  SR STATUS\r\n"
        "  SR HP | MANA | MOVE | TARGET\r\n"
        "  SR ROOM | EXITS | GROUP | GEAR | INV | AFX | DANGER\r\n"
        "CR controls a cooperating desktop client's Reader features when available.\r\n");
}

void do_sr_reference(struct char_data *ch, const char *argument)
{
    char arg[256];
    const char *rest;

    if (!ch || is_npc(ch))
        return;

    rest = one_argument(argument ? argument : "", arg);

    if (!*arg) {
        send_to_char(ch, "Server screen-reader mode is %s.\r\n",
                     player_reader_enabled(ch) ? "ON" : "OFF");
        send_to_char(ch, "Use SR HELP for commands.\r\n");
        return;
    }

    if (is_abbrev(arg, "help")) {
        sr_help(ch);
        return;
    }

    if (same_word(arg, "on") || same_word(arg, "enable")) {
        /* Optional: snapshot compatible client settings before coordinated use. */
        (void)accessibility_send_control_request(ch, "reader.session.begin", NULL);
        set_player_reader_enabled(ch, true);
        set_player_compact_combat(ch, true);
        send_to_char(ch, "Server screen-reader mode is ON.\r\n");
        return;
    }

    if (same_word(arg, "off") || same_word(arg, "disable") ||
        same_word(arg, "normal") || same_word(arg, "restore") ||
        same_word(arg, "exit")) {
        set_player_reader_enabled(ch, false);
        send_to_char(ch, "Server screen-reader mode is OFF.\r\n");
        (void)accessibility_send_control_request(ch, "reader.exit.restore", NULL);
        return;
    }

    if (is_abbrev(arg, "setup")) {
        char profile[128];
        one_argument(rest, profile);
        sr_apply_setup_profile(ch, profile);
        return;
    }

    if (is_abbrev(arg, "status")) {
        send_to_char(ch, "Screen reader: %s.\r\n",
                     player_reader_enabled(ch) ? "on" : "off");
        return;
    }

    if (is_abbrev(arg, "hp") || is_abbrev(arg, "hitpoints")) {
        send_resource(ch, "Hit points", current_hit(ch), maximum_hit(ch));
        return;
    }
    if (is_abbrev(arg, "mana")) {
        send_resource(ch, "Mana", current_mana(ch), maximum_mana(ch));
        return;
    }
    if (is_abbrev(arg, "move") || is_abbrev(arg, "movement")) {
        send_resource(ch, "Move", current_move(ch), maximum_move(ch));
        return;
    }
    if (is_abbrev(arg, "room")) { send_reader_room(ch); return; }
    if (is_abbrev(arg, "exits")) { send_reader_exits(ch); return; }
    if (is_abbrev(arg, "target") || is_abbrev(arg, "mob")) { send_reader_target(ch); return; }
    if (is_abbrev(arg, "group")) { send_reader_group(ch); return; }
    if (is_abbrev(arg, "gear")) { send_reader_gear(ch); return; }
    if (is_abbrev(arg, "inv") || is_abbrev(arg, "inventory")) { send_reader_inventory(ch); return; }
    if (is_abbrev(arg, "afx") || is_abbrev(arg, "affects")) { send_reader_affects(ch); return; }
    if (is_abbrev(arg, "danger")) { send_reader_danger(ch); return; }

    sr_help(ch);
}

static bool require_controls(struct char_data *ch)
{
    if (accessibility_controls_available(ch))
        return true;

    send_to_char(ch,
        "Client Reader controls are unavailable on this connection. "
        "Server SR commands still work normally.\r\n");
    return false;
}

static bool send_control(struct char_data *ch,
                         const char *action,
                         const char *value,
                         const char *failure)
{
    if (!require_controls(ch))
        return false;
    if (accessibility_send_control_request(ch, action, value))
        return true;
    send_to_char(ch, "%s\r\n", failure);
    return false;
}

static void cr_help(struct char_data *ch)
{
    send_to_char(ch,
        "CLIENT READER commands (CR is shorthand):\r\n"
        "  CR STATUS | OFF | DOCTOR | RECOVER | UNREAD | CONTEXT\r\n"
        "  CR SETUP NATIVE|LIVE|FAST|QUIET\r\n"
        "  CR WORKSPACE ON|OFF|TOGGLE\r\n"
        "  CR LOAD MUSHSETTINGS\r\n"
        "  CR KEYS STATUS|LINES|MOVEMENT|MUSH\r\n"
        "  CR VOICE ... | AUDIO ... | SOUND ... | SOUNDPACK ...\r\n"
        "  CR LINES ... | CATEGORY ... | REVIEW ... | ALERTS ...\r\n");
}

void do_cr_reference(struct char_data *ch, const char *argument)
{
    char sub[256], value[256];
    const char *rest;

    if (!ch || is_npc(ch))
        return;

    rest = one_argument(argument ? argument : "", sub);
    if (!*sub || is_abbrev(sub, "help")) {
        cr_help(ch);
        return;
    }

    if (same_word(sub, "off") || same_word(sub, "normal") ||
        same_word(sub, "restore") || same_word(sub, "exit")) {
        set_player_reader_enabled(ch, false);
        send_to_char(ch, "Server screen-reader mode is OFF.\r\n");
        (void)send_control(ch, "reader.exit.restore", NULL,
                           "Client setup restoration request could not be sent.");
        return;
    }

    if (is_abbrev(sub, "status")) {
        send_to_char(ch, "Server reader state: %s.\r\n",
                     player_reader_enabled(ch) ? "on" : "off");
        (void)send_control(ch, "reader.status", NULL,
                           "Client Reader status request could not be sent.");
        return;
    }

    if (is_abbrev(sub, "setup")) {
        one_argument(rest, value);
        if (!*value)
            strcpy(value, "native");
        if (!same_word(value, "native") && !same_word(value, "live") &&
            !same_word(value, "fast") && !same_word(value, "quiet")) {
            send_to_char(ch, "Use CR SETUP NATIVE, LIVE, FAST, or QUIET.\r\n");
            return;
        }
        if (!require_controls(ch))
            return;
        if (!accessibility_send_control_request(ch, "reader.session.begin", NULL)) {
            send_to_char(ch,
                "Current client setup could not be saved; Reader setup was not applied.\r\n");
            return;
        }
        sr_apply_setup_profile(ch, "balanced");
        (void)send_control(ch, "reader.preset", value,
                           "Server Reader setup succeeded, but client preset request failed.");
        return;
    }

    if (is_abbrev(sub, "workspace")) {
        one_argument(rest, value);
        if (!same_word(value, "on") && !same_word(value, "off") &&
            !same_word(value, "toggle")) {
            send_to_char(ch, "Use CR WORKSPACE ON, OFF, or TOGGLE.\r\n");
            return;
        }
        (void)send_control(ch, "reader.workspace", value,
                           "Client Reader Workspace request could not be sent.");
        return;
    }

    if (is_abbrev(sub, "load")) {
        one_argument(rest, value);
        if (!same_word(value, "mushsettings")) {
            send_to_char(ch, "Use CR LOAD MUSHSETTINGS.\r\n");
            return;
        }
        if (!require_controls(ch))
            return;
        if (!accessibility_send_control_request(ch, "reader.session.begin", NULL)) {
            send_to_char(ch,
                "Current client setup could not be saved; MUSH settings were not applied.\r\n");
            return;
        }
        (void)send_control(ch, "reader.load.mushsettings", NULL,
                           "Client MUSH settings request could not be sent.");
        return;
    }

    if (is_abbrev(sub, "doctor")) {
        (void)send_control(ch, "reader.doctor", NULL,
                           "Client Reader doctor request could not be sent.");
        return;
    }
    if (is_abbrev(sub, "recover")) {
        (void)send_control(ch, "reader.recover", NULL,
                           "Client Reader recovery request could not be sent.");
        return;
    }
    if (is_abbrev(sub, "unread")) {
        (void)send_control(ch, "reader.unread", NULL,
                           "Client Reader unread request could not be sent.");
        return;
    }
    if (is_abbrev(sub, "context")) {
        (void)send_control(ch, "reader.context", NULL,
                           "Client Reader context request could not be sent.");
        return;
    }

    /*
     * Production NukeFire also dispatches VOICE, AUDIO, SOUND, SOUNDPACK,
     * KEYS, LINES, CATEGORY, REVIEW, ALERTS, SPEECH, and OUTPUT here.  The
     * control IDs are documented in nukefire_controls_reference.c and the
     * player-facing guide.  Keep each branch bounded and validate values before
     * sending them to the client.
     */
    cr_help(ch);
}
