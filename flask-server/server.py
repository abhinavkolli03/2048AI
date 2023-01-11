from flask import Flask
from game import *
from DQN import *
from utils import *
from multiprocessing import Process, Value
import asyncio

from flask_cors import CORS, cross_origin

# content to be returned
board = [[]]
complete = False
current_score = 0


# game parameters and initialization
env = Game()
dqn_agent = DQN(env=env)
env.restart()

# iterators
current_trial = 0
prev_trial = 0
step = 0

async def getRewards():
    return dqn_agent.reward_chart

async def reset():
    global env
    global dqn_agent
    global current_trial
    global current_score
    global prev_trial
    global step
    global board
    env = Game()
    dqn_agent = DQN(env=env)
    board = env.restart()
    current_trial = 0
    prev_trial = 0
    step = 0
    current_score = 0
    return board
    
async def resetGame():
    global env
    global current_trial
    global prev_trial
    global step
    global board
    global current_score
    board = env.restart()
    current_trial = 0
    prev_trial = 0
    step = 0
    current_score = 0
    return board

async def gameIteration():
    global current_trial
    global prev_trial
    global step
    global board
    global complete
    global current_score
    cur_state = env.get_board().reshape(4, 4)
    trial_len = 500
    if current_trial > prev_trial:
        if env.maxNumber() >= 256:
            dqn_agent.save_model("trial num-{}.model".format(current_trial))
        if step < 500:
            if env.maxNumber() == 2048:
                print("Completed in --", current_trial)
                print(env.get_board())
                dqn_agent.save_model("success.model")
            else:
                print(f"Trial number {current_trial} Failed to complete in 500 steps")
                print(env.get_board())
        else:
            print(f"Failed to complete in 500 steps")
            print(env.get_board())
        dqn_agent.save_reward()
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
            action = dqn_agent.act(cur_state)
            _, reward, done, _ = env.step(action)
            new_state = env.get_board()
            dqn_agent.remember(cur_state, action, reward, new_state, done)
            if reward >= 0:
                current_score += reward                
            if step % 5 == 0:
                dqn_agent.replay()
                dqn_agent.target_train()
            cur_state = new_state
            if done:
                current_trial += 1
                step = 0
            print(f"Move {step}:")
            print(env.get_board())
            board = env.get_board()

loop = asyncio.get_event_loop()
app = Flask(__name__, static_folder='client/build')

# restart route
@app.route("/restart", methods=['GET'])
def restart():
    board = loop.run_until_complete(reset())
    return {"board": board.tolist()}

# set new game route
@app.route("/newgame", methods=['GET'])
def newgame():
    board = loop.run_until_complete(resetGame())
    return {"board": board.tolist()}

# data route
@app.route("/data", methods=['GET'])
def data():
    loop.run_until_complete(gameIteration())
    return {"board": board.tolist(), "complete": complete, "score": current_score, "trial": current_trial}

# collect rewards from episodes
@app.route("/rewards", methods=["GET"])
def rewards():
    content = loop.run_until_complete(getRewards())
    return {"rewards": content}

if __name__ == "__main__":
    app.run(debug=False)