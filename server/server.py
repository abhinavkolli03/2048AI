from flask import Flask, request, jsonify
from game import Game
from DQN import DQN
from DDQN import DDQN
from utils import process_log, get_grids_next_step
import threading
import asyncio

from flask.helpers import send_from_directory
from flask_cors import CORS, cross_origin

# Flask app initialization
app = Flask(__name__, static_folder='client/build', static_url_path='/')
CORS(app)

# Initial states
env = Game()
dqn_agent = DQN(env=env)
ddqn_agent = DDQN(env=env)
current_agent = dqn_agent  # Default agent
env.restart()

# Game state variables
board = env.get_board()
complete = False
current_score = 0
current_reward = 0
current_trial = 0
prev_trial = 0
step = 0

# Threading variables
game_thread = None
game_thread_lock = threading.Lock()

def getRewards():
    return current_agent.reward_chart

def reset():
    global env, current_trial, prev_trial, step, current_score, board
    env = Game()
    board = env.restart()
    current_trial = 0
    prev_trial = 0
    step = 0
    current_score = 0
    return board

def resetGame():
    global env, current_trial, prev_trial, step, current_score, board
    board = env.restart()
    current_trial = 0
    prev_trial = 0
    step = 0
    current_score = 0
    return board

def gameIteration():
    global current_trial, prev_trial, step, board, complete, current_score, current_reward
    cur_state = env.get_board().reshape(4, 4)
    trial_len = 500
    if current_trial > prev_trial:
        if env.maxNumber() >= 256:
            current_agent.save_model(f"model-deployments/trial_num-{current_trial}.model")
        if step < 500:
            if env.maxNumber() == 2048:
                print(f"Completed in -- {current_trial}")
                print(env.get_board())
                current_agent.save_model("success.model")
            else:
                print(f"Trial number {current_trial} Failed to complete in 500 steps")
                print(env.get_board())
        else:
            print("Failed to complete in 500 steps")
            print(env.get_board())
        current_agent.save_reward()
        prev_trial += 1
        env.restart()
        complete = True
        current_score = 0
    else:
        complete = False
        if step > trial_len:
            current_trial += 1
            step = 0
        else:
            step += 1
            action = current_agent.act(cur_state)
            _, reward, done, _, scored = env.step(action)
            new_state = env.get_board()
            current_agent.remember(cur_state, action, reward, new_state, done)
            current_reward += reward
            if scored >= 0:
                current_score += scored                
            if step % 10 == 0:
                current_agent.replay()
                current_agent.target_train()
            cur_state = new_state
            if done:
                current_trial += 1
                step = 0
            print(f"Move {step}:")
            print(env.get_board())
            board = env.get_board()

# Flask routes

@app.route("/set_agent", methods=['POST'])
def set_agent():
    global current_agent, dqn_agent, ddqn_agent
    agent_type = request.json.get('agent', 'dqn')
    if agent_type == 'ddqn':
        current_agent = ddqn_agent
    else:
        current_agent = dqn_agent
    # resetting game for new agent
    reset()
    return jsonify({"status": "success", "agent": agent_type})

@app.route("/restart", methods=['GET'])
def restart():
    board = reset()
    return {"board": board.tolist()}

@app.route("/newgame", methods=['GET'])
def newgame():
    board = resetGame()
    return {"board": board.tolist()}

@app.route("/data", methods=['GET'])
def data():
    global game_thread, game_thread_lock
    with game_thread_lock:
        if game_thread is None or not game_thread.is_alive():
            game_thread = threading.Thread(target=gameIteration)
            game_thread.start()
    return {"board": board.tolist(), "complete": complete, "score": current_score, "reward": current_reward, "trial": current_trial}

@app.route("/rewards", methods=["GET"])
def rewards():
    content = getRewards()
    return {"rewards": content}

@app.route('/')
@cross_origin()
def serve():
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    app.run(debug=False)
