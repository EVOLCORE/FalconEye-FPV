from setuptools import find_packages, setup

package_name = 'falconeye_guidance'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='FalconEye Team',
    maintainer_email='dev@falconeye.local',
    description='FalconEye FPV Visual Servoing (IBVS) and Autonomy State Machine',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'guidance_node = falconeye_guidance.guidance_node:main',
        ],
    },
)
