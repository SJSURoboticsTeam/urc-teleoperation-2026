import ikpy.chain
import os
import matplotlib.pyplot
from mpl_toolkits.mplot3d import Axes3D


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
solution = my_chain.inverse_kinematics(target_xyz)
print("Joint angles:", solution)

ax = matplotlib.pyplot.figure().add_subplot(111, projection='3d')

my_chain.plot(my_chain.inverse_kinematics([0.15, 0.0, -1.2]), ax)
matplotlib.pyplot.show()