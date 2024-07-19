import React, { useEffect, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { rating, rate, ordinal, predictWin, predictDraw } from "openskill";
import { Rating } from "openskill/dist/types";
import { v4 as uuid } from "uuid";
import { flatten, orderBy, range, zipWith } from "lodash";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button, CloseButton, Container, Row, Table } from "react-bootstrap";

const STORAGE_KEY = "players";

export type Player = Rating & {
  id: string;
  name: string;
};

function getInitialPlayers(): Player[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  } else {
    return [];
  }
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>(getInitialPlayers);
  const [teams, setTeams] = useState<Player[][]>([]);
  const selected = flatten(teams);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  }, [players]);

  function deleteTeam(index: number) {
    if (index < teams.length) {
      setTeams([...teams.slice(0, index), ...teams.slice(index + 1)]);
    }
  }

  function updateTeam(index: number, team: Player[]) {
    if (index >= teams.length) {
      setTeams([...teams, team]);
    } else {
      setTeams(teams.map((t, i) => (index === i ? team : t)));
    }
  }

  function addPlayer(name: string) {
    const player: Player = { id: uuid(), name, ...rating() };
    setPlayers([...players, player]);
    return player;
  }

  function deletePlayer(player: Player) {
    setPlayers(players.filter((p) => p.id !== player.id));
    if (selected.includes(player)) {
      setTeams(
        teams
          .map((team) => team.filter((p) => p.id !== player.id))
          .filter((team) => team.length > 0),
      );
    }
  }

  return (
    <Container>
      <Row>
        <Table size="sm">
          {zipWith(
            [...teams, []],
            [...predictWin(teams), predictDraw(teams)],
            range(teams.length + 1),
            (team, prob, index) => (
              <tr key={index}>
                <td>
                  {team && (
                    <CreatableSelect
                      isMulti
                      onChange={(newValue) => {
                        if (newValue.length === 0) {
                          deleteTeam(index);
                        } else {
                          updateTeam(
                            index,
                            newValue.map(({ value }) => value),
                          );
                        }
                      }}
                      onCreateOption={(name) => {
                        const player = addPlayer(name);
                        updateTeam(index, [...team, player]);
                      }}
                      options={players.map((p) => ({
                        label: p.name,
                        value: p,
                      }))}
                      value={team.map((p) => ({ label: p.name, value: p }))}
                      isOptionDisabled={(option) =>
                        selected.includes(option.value)
                      }
                    />
                  )}
                </td>

                <td>{prob && prob.toFixed(5)}</td>
              </tr>
            ),
          )}
        </Table>
        {teams.length >= 2 && (
          <Button
            onClick={() => {
              const newTeams = rate(teams);
              const newRatings: Record<string, Rating> = {};

              zipWith(teams, newTeams, (oldTeam, newTeam) => {
                zipWith(oldTeam, newTeam, (player, rating) => {
                  newRatings[player.id] = rating;
                });
              });
              setPlayers(
                orderBy(
                  players.map((player) =>
                    player.id in newRatings
                      ? { ...player, ...newRatings[player.id] }
                      : player,
                  ),
                  [(p) => ordinal(p), "mu", "sigma", "name"],
                  ["desc", "desc", "asc", "asc"],
                ),
              );
              setTeams([]);
            }}
          >
            Rate
          </Button>
        )}
      </Row>
      <Row>
        <Table size="sm">
          <thead>
            <tr>
              <th>rank</th>
              <th>name</th>
              <th>ordinal</th>
              <th>mu</th>
              <th>sigma</th>
              <th>delete</th>
            </tr>
          </thead>
          {players.map((player, index) => (
            <tr key={player.id}>
              <td>{index + 1}</td>
              <td>{player.name}</td>
              <td>{ordinal(player).toFixed(3)}</td>
              <td>{player.mu.toFixed(3)}</td>
              <td>{player.sigma.toFixed(3)}</td>
              <td>
                <CloseButton onClick={() => deletePlayer(player)} />
              </td>
            </tr>
          ))}
        </Table>
      </Row>
    </Container>
  );
}
