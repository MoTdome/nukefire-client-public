/*
 * NukeFire.Controls — sanitized GMCP accessibility bridge reference
 *
 * This is intentionally an adaptation reference, not a drop-in replacement for
 * NukeFire's complete gmcp.c.  It demonstrates the important security model:
 * capability negotiation + strict semantic allowlist + bounded JSON packets.
 */

#include "nukefire_controls_reference.h"
#include <ctype.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <cjson/cJSON.h>

/* Replace these with your MUD's own declarations. */
extern bool gmcp_enabled(struct descriptor_data *d);
extern bool gmcp_supports_controls(struct descriptor_data *d); /* e.g. NukeFire.Controls 1 */
extern bool gmcp_send_package(struct descriptor_data *d,
                              const char *package,
                              const char *json_text);
extern void send_to_char(struct char_data *ch, const char *fmt, ...);
extern bool valid_player_character(struct char_data *ch);
extern struct descriptor_data *descriptor_for(struct char_data *ch);
extern struct char_data *character_for(struct descriptor_data *d);

static uint32_t request_serial = 0;

bool accessibility_control_action_allowed(const char *action)
{
    /*
     * Never replace this with "accept any string and execute it in the client".
     * The allowlist is the security boundary.
     */
    static const char *allowed[] = {
        "client.status",
        "reader.status",
        "reader.preset",
        "reader.workspace",
        "reader.native.enabled",
        "reader.session.begin",
        "reader.exit.restore",

        "reader.voice.enabled",
        "reader.voice.muted",
        "reader.voice.stop",
        "reader.voice.test",
        "reader.voice.rate",
        "reader.voice.pitch",
        "reader.voice.volume",
        "reader.voice.foreground",
        "reader.voice.governor",
        "reader.voice.priority",
        "reader.voice.follow",
        "reader.voice.interrupt",
        "reader.voice.voices",
        "reader.voice.use",
        "reader.voice.restart",

        "reader.vitals.format",
        "reader.announcements.enabled",

        "reader.audio.status",
        "reader.audio.enabled",
        "reader.audio.muted",
        "reader.audio.stop",
        "reader.audio.test",
        "reader.audio.volume",
        "reader.audio.foreground",

        "reader.sound.status",
        "reader.sound.channel",
        "reader.sound.background",
        "reader.sound.test",
        "reader.sound.reset",

        "reader.soundpack.status",
        "reader.soundpack.list",
        "reader.soundpack.import",
        "reader.soundpack.use",
        "reader.soundpack.builtin",
        "reader.soundpack.test",
        "reader.soundpack.events",
        "reader.soundpack.show",
        "reader.soundpack.assign",
        "reader.soundpack.clear",
        "reader.soundpack.volume",
        "reader.soundpack.duplicate",
        "reader.soundpack.export",

        "reader.accessibility.command",

        "reader.doctor",
        "reader.recover",
        "reader.unread",
        "reader.context",
        "reader.keys",
        "reader.tutorial",
        "reader.alerts.enabled",

        "reader.category.next",
        "reader.category.previous",
        "reader.category.status",

        "reader.review.repeat",
        "reader.review.first",
        "reader.review.back",
        "reader.review.forward",
        "reader.review.latest",
        "reader.review.previous",
        "reader.review.next",
        "reader.review.tell",
        "reader.review.communication",

        "reader.lines.current",
        "reader.lines.previous",
        "reader.lines.next",
        "reader.lines.latest",
        "reader.lines.recall",

        "reader.load.mushsettings",
        NULL
    };
    int i;

    if (!action || !*action)
        return false;

    for (i = 0; allowed[i]; ++i)
        if (!strcmp(action, allowed[i]))
            return true;

    return false;
}

bool accessibility_controls_available(struct char_data *ch)
{
    struct descriptor_data *d;

    if (!valid_player_character(ch))
        return false;

    d = descriptor_for(ch);
    return d && gmcp_enabled(d) && gmcp_supports_controls(d);
}

bool accessibility_send_control_request(struct char_data *ch,
                                        const char *action,
                                        const char *value)
{
    struct descriptor_data *d;
    cJSON *root = NULL;
    cJSON *args = NULL;
    char *serialized = NULL;
    bool sent = false;

    if (!accessibility_controls_available(ch) ||
        !accessibility_control_action_allowed(action))
        return false;

    d = descriptor_for(ch);

    root = cJSON_CreateObject();
    args = cJSON_CreateObject();
    if (!root || !args)
        goto cleanup;

    ++request_serial;
    if (request_serial == 0)
        ++request_serial;

    cJSON_AddNumberToObject(root, "schema", 1);
    cJSON_AddNumberToObject(root, "id", request_serial);
    cJSON_AddStringToObject(root, "action", action);

    if (value && *value)
        cJSON_AddStringToObject(args, "value", value);

    cJSON_AddItemToObject(root, "args", args);
    args = NULL;

    serialized = cJSON_PrintUnformatted(root);
    if (!serialized)
        goto cleanup;

    sent = gmcp_send_package(d, "NukeFire.Controls.Request", serialized);

cleanup:
    free(serialized);
    if (args)
        cJSON_Delete(args);
    if (root)
        cJSON_Delete(root);
    return sent;
}

static void clean_result_message(char *out, size_t out_size, const char *input)
{
    size_t used = 0;

    if (!out || out_size == 0)
        return;
    out[0] = '\0';

    if (!input)
        return;

    while (*input && used + 1 < out_size) {
        unsigned char c = (unsigned char)*input++;

        if (c == '\r' || c == '\n' || c == '\t')
            c = ' ';
        else if (c < 32 || c == 127)
            continue;

        out[used++] = (char)c;
    }
    out[used] = '\0';
}

void accessibility_handle_control_result(struct descriptor_data *d,
                                         const char *json_text)
{
    cJSON *root = NULL;
    cJSON *schema;
    cJSON *id;
    cJSON *ok;
    cJSON *action;
    cJSON *message;
    struct char_data *ch;
    char clean[512];
    bool success;

    if (!d || !json_text || !*json_text || !gmcp_supports_controls(d))
        return;

    ch = character_for(d);
    if (!ch)
        return;

    root = cJSON_Parse(json_text);
    if (!root || !cJSON_IsObject(root))
        goto cleanup;

    schema = cJSON_GetObjectItemCaseSensitive(root, "schema");
    id = cJSON_GetObjectItemCaseSensitive(root, "id");
    ok = cJSON_GetObjectItemCaseSensitive(root, "ok");
    action = cJSON_GetObjectItemCaseSensitive(root, "action");
    message = cJSON_GetObjectItemCaseSensitive(root, "message");

    if (!cJSON_IsNumber(schema) || schema->valueint != 1 ||
        !cJSON_IsNumber(id) || id->valuedouble < 1 ||
        id->valuedouble > 4294967295.0 ||
        (!cJSON_IsTrue(ok) && !cJSON_IsFalse(ok)) ||
        !cJSON_IsString(action) || !action->valuestring ||
        !cJSON_IsString(message) || !message->valuestring)
        goto cleanup;

    if (!accessibility_control_action_allowed(action->valuestring))
        goto cleanup;

    clean_result_message(clean, sizeof(clean), message->valuestring);
    if (!*clean)
        goto cleanup;

    success = cJSON_IsTrue(ok);

    /*
     * Echo failures and useful status results.  Review/line actions normally
     * announce themselves locally in the client; echoing every successful
     * review operation would duplicate screen-reader output.
     */
    if (!success ||
        !strcmp(action->valuestring, "client.status") ||
        !strcmp(action->valuestring, "reader.status") ||
        !strcmp(action->valuestring, "reader.audio.status") ||
        !strcmp(action->valuestring, "reader.sound.status") ||
        !strcmp(action->valuestring, "reader.preset"))
        send_to_char(ch, "Client: %s\r\n", clean);

cleanup:
    if (root)
        cJSON_Delete(root);
}
