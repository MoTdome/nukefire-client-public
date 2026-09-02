#ifndef NUKEFIRE_CONTROLS_REFERENCE_H
#define NUKEFIRE_CONTROLS_REFERENCE_H

/*
 * Sanitized accessibility-control reference.
 *
 * Adapt struct char_data / descriptor_data and your GMCP support helpers to
 * your codebase.  This file intentionally exposes only the accessibility
 * bridge, not NukeFire's unrelated GMCP packages.
 */

#include <stdbool.h>

struct char_data;
struct descriptor_data;

bool accessibility_controls_available(struct char_data *ch);
bool accessibility_control_action_allowed(const char *action);
bool accessibility_send_control_request(struct char_data *ch,
                                        const char *action,
                                        const char *value);
void accessibility_handle_control_result(struct descriptor_data *d,
                                         const char *json_text);

#endif
