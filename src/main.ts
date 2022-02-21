import { css, html, LitElement, property, state } from 'lit-element';
import Service from './service';
import './player';
import './group';
import './grouping-buttons';
import './favorite-buttons';
import { getEntityName } from './utils';
import { HomeAssistant } from 'custom-card-helpers';
import { CardConfig, PlayerGroups } from './types';

export class CustomSonosCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() config!: CardConfig;
  @state() private active!: string;
  @state() showVolumes!: boolean;
  private service!: Service;

  render() {
    this.service = new Service(this.hass);
    const mediaPlayers = [...new Set(this.config.entities)].sort().filter((player) => this.hass.states[player]);
    const playerGroups = this.createPlayerGroups(mediaPlayers);
    this.determineActivePlayer(playerGroups);
    return html`
      ${this.config.name
        ? html`
            <div class="header">
              <div class="name">${this.config.name}</div>
            </div>
          `
        : ''}
      <div class="content">
        <div class="groups">
          <div class="title">${this.config.groupsTitle ? this.config.groupsTitle : 'Groups'}</div>
          ${Object.keys(playerGroups).map(
            (group) => html`
              <sonos-group
                .hass=${this.hass}
                .group=${group}
                .config=${this.config}
                .active=${this.active === group}
                @click="${() => {
                  this.setActivePlayer(group);
                  this.showVolumes = false;
                }}"
              >
              </sonos-group>
            `,
          )}
        </div>

        <div class="players">
          <sonos-player
            .hass=${this.hass}
            .config=${this.config}
            .entityId=${this.active}
            .main=${this}
            .members=${playerGroups[this.active].members}
            .service=${this.service}
          >
          </sonos-player>
          <div class="title">${this.config.groupingTitle ? this.config.groupingTitle : 'Grouping'}</div>
          <sonos-grouping-buttons
            .hass=${this.hass}
            .config=${this.config}
            .groups=${playerGroups}
            .mediaPlayers=${mediaPlayers}
            .active=${this.active}
            .service=${this.service}
          >
          </sonos-grouping-buttons>
        </div>

        <div class="sidebar">
          <div class="title">${this.config.favoritesTitle ? this.config.favoritesTitle : 'Favorites'}</div>
          <sonos-favorite-buttons
            .hass=${this.hass}
            .config=${this.config}
            .mediaPlayers=${mediaPlayers}
            .active=${this.active}
            .service=${this.service}
          >
          </sonos-favorite-buttons>
        </div>
      </div>
    `;
  }

  determineActivePlayer(playerGroups: PlayerGroups) {
    const selected_player = window.location.href.indexOf('#') > 0 ? window.location.href.replaceAll(/.*#/g, '') : '';
    if (this.active) {
      this.setActivePlayer(this.active);
    }
    if (!this.active) {
      for (const player in playerGroups) {
        if (player === selected_player) {
          this.setActivePlayer(player);
        } else {
          for (const member in playerGroups[player].members) {
            if (member === selected_player) {
              this.setActivePlayer(player);
            }
          }
        }
      }
    }
    if (!this.active) {
      for (const player in playerGroups) {
        if (playerGroups[player].state === 'playing') {
          this.setActivePlayer(player);
        }
      }
    }
    if (!this.active) {
      this.setActivePlayer(Object.keys(playerGroups)[0]);
    }
  }

  createPlayerGroups(mediaPlayers: string[]): PlayerGroups {
    const groupMasters = mediaPlayers.filter((player) => {
      const state = this.hass.states[player];
      const stateAttributes = state.attributes;
      const isGrouped = stateAttributes.sonos_group.length > 1;
      const isMasterInGroup = isGrouped && stateAttributes.sonos_group[0] === player;
      return !isGrouped || isMasterInGroup;
    });
    const groupArray = groupMasters.map((groupMaster) => {
      const state = this.hass.states[groupMaster];
      const membersArray = state.attributes.sonos_group.filter((member: string) => member !== groupMaster);
      return {
        entity: groupMaster,
        state: state.state,
        roomName: getEntityName(this.hass, this.config, groupMaster),
        members: Object.fromEntries(
          membersArray.map((member: string) => {
            const friendlyName = getEntityName(this.hass, this.config, member);
            return [member, friendlyName];
          }),
        ),
      };
    });
    return Object.fromEntries(groupArray.map((group) => [group.entity, group]));
  }

  setConfig(config: CardConfig) {
    if (!config.entities) {
      throw new Error('You need to define entities');
    }
    this.config = config;
  }

  getCardSize() {
    return this.config.entities.length + 1;
  }

  static get styles() {
    return css`
      :host {
        --sonos-int-box-shadow: var(
          --ha-card-box-shadow,
          0px 2px 1px -1px rgba(0, 0, 0, 0.2),
          0px 1px 1px 0px rgba(0, 0, 0, 0.14),
          0px 1px 3px 0px rgba(0, 0, 0, 0.12)
        );
        --sonos-int-background-color: var(--sonos-background-color, var(--card-background-color));
        --sonos-int-player-section-background: var(--sonos-player-section-background, #ffffffe6);
        --sonos-int-color: var(--sonos-color, var(--secondary-text-color));
        --sonos-int-artist-album-text-color: var(--sonos-artist-album-text-color, var(--primary-text-color));
        --sonos-int-accent-color: var(--sonos-accent-color, var(--accent-color));
        --sonos-int-title-color: var(--sonos-title-color, var(--card-background-color));
        --mdc-icon-size: 18px;
        color: var(--sonos-int-color);
      }
      .header {
        font-size: 24px;
        letter-spacing: -0.012em;
        line-height: 32px;
        padding: 4px 0 12px;
        display: block;
      }
      .header .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .players {
        flex: 0 0 40%;
      }
      .content {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: center;
      }
      .groups {
        margin: 0 20px 0 20px;
        padding: 0;
        flex: 0 0 20%;
      }
      .sidebar {
        margin: 0 20px 0 20px;
        padding: 0;
        flex: 0 0 20%;
      }
      .title {
        margin-top: 10px;
        text-align: center;
        font-weight: bold;
        font-size: larger;
        color: var(--sonos-int-title-color);
      }
      @media (max-width: 650px) {
        .content {
          flex-wrap: wrap;
        }
        .players {
          order: 0;
        }
        .groups {
          order: 1;
        }
        .sidebar {
          order: 2;
        }
      }
    `;
  }

  setActivePlayer(player: string) {
    this.active = player;
    const newUrl = window.location.href.replaceAll(/#.*/g, '');
    window.location.href = `${newUrl}#${player}`;
  }
}

customElements.define('custom-sonos-card', CustomSonosCard);