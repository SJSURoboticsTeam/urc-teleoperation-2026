import math
import ikpy.chain
import os
import matplotlib.pyplot
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import numpy.typing as npt


_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_URDF_PATH = os.path.join(_SCRIPT_DIR, "models", "robot.urdf")

my_chain = ikpy.chain.Chain.from_urdf_file(
    _URDF_PATH,
    base_elements=[
        "frame",
        "arm_track_slider",
        "armbase",
        "arm_bicep_right",
        "bicepright",
        "arm_elbow_left",
        "armforearm"
    ]
)

target_xyz = [-0.15, -0.20, -0.25]
initial_guess = [0, -0.15, 0.0, -1.2]

solution = my_chain.inverse_kinematics(target_xyz, initial_position=initial_guess)
print("Joint angles:", solution)

ax = matplotlib.pyplot.figure().add_subplot(111, projection='3d')
my_chain.plot(solution, ax) 
matplotlib.pyplot.show()

def solve_ik(target_xyz, initial_guess = None):
    initial_guess = [0, -0.15, 0.0, -1.2]
    try:
        solution = my_chain.inverse_kinematics(target_xyz, initial_position=initial_guess)
        return solution
    except Exception as e:
        print()
        return None

    
async def move_arm_ik(serial_ports, target_xyz, initial_guess=None):
    from arm import send_arm_joint
    solution = solve_ik(target_xyz, initial_guess)

    track_meters, shoulder_radians, elbow_radians = solution[1], solution[2], solution[3]

    track_cm = track_meters * 100
    shoulder_deg = math.degrees(shoulder_radians)
    elbow_deg = math.degrees(elbow_radians)

    track = send_arm_joint(serial_ports, "track", track_cm)
    shoulder = send_arm_joint(serial_ports, "shoulder", shoulder_deg)
    elbow = send_arm_joint(serial_ports, "elbow", elbow_deg)

    return track and shoulder and elbow

# takes in NumPy arrays as parameters
# which should be in the form of a 3D coordinate for origin
# and vectors for u_axis and v_axis
def plane_to_space(target_x, target_y, origin: npt.NDArray, u_axis: npt.NDArray, v_axis: npt.NDArray):
    plane_origin = origin
    plane_u = u_axis
    plane_v = v_axis

    calculated_coord = plane_origin + (target_x * plane_u) + (target_y * plane_v)

    return calculated_coord





